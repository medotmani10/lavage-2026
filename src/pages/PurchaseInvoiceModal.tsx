/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { queueOperation } from '../lib/sync';
import { showAlert } from '../stores/useDialogStore';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { X, Plus, Trash2, FileText, Package, CheckCircle2 } from 'lucide-react';


interface PurchaseInvoiceModalProps {
    onClose: () => void;
    onAddNewProduct: () => void;
}

interface InvoiceLine {
    id: string; // temp id for the UI
    product_id: string;
    quantity: number;
    unit_cost: number;
    unit_price: number;
    subtotal: number;
}

export function PurchaseInvoiceModal({ onClose, onAddNewProduct }: PurchaseInvoiceModalProps) {
    const [isLoading, setIsLoading] = useState(false);

    // Header state
    const [supplierId, setSupplierId] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    // Lines state
    const [lines, setLines] = useState<InvoiceLine[]>([]);

    // Payment state
    const [paidAmount, setPaidAmount] = useState<number | ''>('');

    const { data: rawProducts } = useSupabaseData<any>('products');
    const { data: rawSuppliers } = useSupabaseData<any>('suppliers');

    const products = rawProducts.filter(p => p.active !== false).sort((a, b) => a.name.localeCompare(b.name));
    const suppliers = rawSuppliers.filter(s => s.active !== false).sort((a, b) => (a.company_name || a.name || '').localeCompare(b.company_name || b.name || ''));

    const totalAmount = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const effectivePaid = Math.min(Number(paidAmount) || 0, totalAmount);
    const remainingDebt = totalAmount - effectivePaid;

    const handleAddLine = () => {
        setLines([
            ...lines,
            {
                id: crypto.randomUUID(),
                product_id: '',
                quantity: 1,
                unit_cost: 0,
                unit_price: 0,
                subtotal: 0
            }
        ]);
    };

    const handleUpdateLine = (id: string, field: keyof InvoiceLine, value: any) => {
        setLines(lines.map(line => {
            if (line.id !== id) return line;

            const updated = { ...line, [field]: value };

            // Auto-fill prices when a product is selected
            if (field === 'product_id' && products) {
                const product = products.find(p => p.id === value);
                if (product) {
                    updated.unit_cost = product.cost_price || 0;
                    updated.unit_price = product.unit_price || 0;
                }
            }

            // Recalculate subtotal
            updated.subtotal = updated.quantity * updated.unit_cost;

            return updated;
        }));
    };

    const handleRemoveLine = (id: string) => {
        setLines(lines.filter(l => l.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!supplierId) {
            showAlert('Veuillez sélectionner un fournisseur', 'warning');
            return;
        }

        if (lines.length === 0) {
            showAlert('La facture doit contenir au moins un produit', 'warning');
            return;
        }

        const invalidLines = lines.some(l => !l.product_id || l.quantity <= 0);
        if (invalidLines) {
            showAlert('Veuillez remplir correctement tous les produits et quantités', 'warning');
            return;
        }

        setIsLoading(true);

        try {
            const invoiceId = crypto.randomUUID();
            const now = new Date().toISOString();
            const { data: supplier } = await supabase.from('suppliers').select('*').eq('id', supplierId).single() as { data: any, error: any };

            // 1. Save Invoice
            await queueOperation('purchase_invoices', 'INSERT', {
                id: invoiceId,
                supplier_id: supplierId,
                invoice_number: invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
                invoice_date: invoiceDate,
                items: lines.map(l => ({
                    product_id: l.product_id,
                    quantity: l.quantity,
                    unit_cost: l.unit_cost,
                    unit_price: l.unit_price, // Saved for traceability
                    subtotal: l.subtotal
                })),
                subtotal: totalAmount,
                tax_amount: 0, // Not managed yet
                total_amount: totalAmount,
                paid_amount: effectivePaid,
                remaining_amount: remainingDebt,
                status: remainingDebt > 0 ? 'partial' : 'completed',
                notes: notes,
                created_at: now,
                updated_at: now
            });

            // 2. Update Products & Record Movements
            for (const line of lines) {
                const { data: product } = await supabase.from('products').select('*').eq('id', line.product_id).single() as { data: any, error: any };
                if (product) {
                    // Update product stock and prices
                    await queueOperation('products', 'UPDATE', {
                        ...product,
                        stock_quantity: (product.stock_quantity || 0) + line.quantity,
                        cost_price: line.unit_cost, // Update to new purchase price
                        unit_price: line.unit_price, // Update selling price
                        supplier_id: supplierId, // Link product to this supplier
                        updated_at: now
                    });

                    // Record stock movement
                    await queueOperation('stock_movements', 'INSERT', {
                        id: crypto.randomUUID(),
                        product_id: product.id,
                        movement_type: 'in',
                        quantity: line.quantity,
                        unit_cost: line.unit_cost,
                        reference_type: 'purchase_invoice',
                        reference_id: invoiceId,
                        notes: `Achats via facture ${invoiceNumber || 'N/A'}`,
                        created_at: now
                    });
                }
            }

            // 3. Update Supplier Balance if there is a debt
            if (remainingDebt > 0 && supplier) {
                await queueOperation('suppliers', 'UPDATE', {
                    ...supplier,
                    balance_owed: (supplier.balance_owed || 0) + remainingDebt,
                    updated_at: now
                });
            }

            // 4. Record Financial Transaction if money was paid
            if (effectivePaid > 0) {
                await queueOperation('financial_transactions', 'INSERT', {
                    id: crypto.randomUUID(),
                    type: 'expense',
                    amount: effectivePaid,
                    description_fr: `Paiement fournisseur (Achat de stock) - Facture ${invoiceNumber || 'N/A'}`,

                    reference_type: 'purchase_invoice',
                    reference_id: invoiceId,
                    created_by: null,
                    created_at: now
                });
            }

            showAlert('Facture d\'achat enregistrée avec succès. Le stock a été mis à jour.', 'success');
            onClose();
        } catch (error) {
            console.error('Error saving invoice:', error);
            showAlert('Erreur lors de l\'enregistrement de la facture.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-lg)] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">

                {/* Modale Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-[var(--border)] shrink-0 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-500/10 rounded-xl border border-primary-500/20">
                            <FileText className="w-6 h-6 text-primary-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">
                                Bon de Réception / Facture d'Achat
                            </h2>
                            <p className="text-sm text-[var(--text-muted)] font-medium mt-0.5">
                                Ajoutez de nouveaux produits au stock
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-panel)] rounded-xl transition-colors absolute top-6 right-6 sm:static"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray space-y-8">

                    {/* Section 1: Informations Fournisseur & Facture */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                            Informations Générales
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[var(--bg-panel)] rounded-xl border border-[var(--border)]">
                            <Select
                                label="Fournisseur *"
                                value={supplierId}
                                onChange={(e) => setSupplierId(e.target.value)}
                                options={[
                                    { value: '', label: 'Sélectionner un fournisseur...' },
                                    ...(suppliers?.map(s => ({ value: s.id, label: s.company_name || s.name || 'Fournisseur' })) || [])
                                ]}
                                required
                            />
                            <Input
                                label="N° Facture / BL"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                placeholder="Laissez vide pour auto-générer"
                            />
                            <Input
                                label="Date"
                                type="date"
                                value={invoiceDate}
                                onChange={(e) => setInvoiceDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Section 2: Lignes de commande */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-secondary-500"></span>
                                Produits Reçus
                            </h3>
                            <div className="flex gap-2">
                                <Button type="button" variant="secondary" onClick={onAddNewProduct} size="sm">
                                    <Package className="w-4 h-4 mr-2" />
                                    Nouveau Produit
                                </Button>
                                <Button type="button" onClick={handleAddLine} size="sm" className="bg-secondary-500 hover:bg-secondary-600 text-white">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Ajouter Ligne
                                </Button>
                            </div>
                        </div>

                        {lines.length === 0 ? (
                            <div className="p-8 text-center border-2 border-dashed border-[var(--border)] rounded-xl text-[var(--text-muted)]">
                                <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p>Aucun produit ajouté à la facture.</p>
                                <p className="text-sm mt-1">Cliquez sur "Ajouter Ligne" ou "Nouveau Produit".</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {lines.map((line, index) => (
                                    <div key={line.id} className="p-4 bg-[var(--bg-panel)] rounded-xl border border-[var(--border)] relative group animate-fade-in flex flex-col md:flex-row gap-4 items-end">

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveLine(line.id)}
                                            className="absolute -top-3 -right-3 w-8 h-8 bg-danger-500 text-white rounded-full flex items-center justify-center shadow-lg md:opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:scale-110"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>

                                        <div className="w-full md:w-1/3">
                                            <Select
                                                label={`Produit ${index + 1} *`}
                                                value={line.product_id}
                                                onChange={(e) => handleUpdateLine(line.id, 'product_id', e.target.value)}
                                                options={[
                                                    { value: '', label: 'Sélectionner...' },
                                                    ...(products?.map(p => ({
                                                        value: p.id,
                                                        label: `${p.name} (Stock: ${p.stock_quantity})`
                                                    })) || [])
                                                ]}
                                                required
                                            />
                                        </div>

                                        <div className="w-full md:w-1/6">
                                            <Input
                                                label="Quantité *"
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={line.quantity}
                                                onChange={(e) => handleUpdateLine(line.id, 'quantity', parseInt(e.target.value) || 0)}
                                                required
                                            />
                                        </div>

                                        <div className="w-full md:w-1/4">
                                            <Input
                                                label="Prix Achat (Unité) *"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={line.unit_cost}
                                                onChange={(e) => handleUpdateLine(line.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                                                required
                                            />
                                        </div>

                                        <div className="w-full md:w-1/4">
                                            <Input
                                                label="Nouv. Prix Vente *"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={line.unit_price}
                                                onChange={(e) => handleUpdateLine(line.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                                required
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Section 3: Totaux & Paiement */}
                    {lines.length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-success-500"></span>
                                Règlement
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <Input
                                        label="Montant Payé au Fournisseur (DZD)"
                                        type="number"
                                        min="0"
                                        max={totalAmount}
                                        step="1"
                                        value={paidAmount}
                                        onChange={(e) => setPaidAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                        placeholder={`Ex: ${totalAmount}`}
                                    />
                                    <Input
                                        label="Notes / Remarques"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Optionnel..."
                                    />
                                </div>

                                <div className="bg-[var(--bg-panel)] rounded-xl border border-[var(--border)] p-5 flex flex-col justify-center">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[var(--text-secondary)] font-medium">Total Facture :</span>
                                        <span className="text-xl font-bold text-white">{totalAmount.toLocaleString()} DZD</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[var(--text-secondary)] font-medium">Payé :</span>
                                        <span className="text-lg font-bold text-success-400">-{effectivePaid.toLocaleString()} DZD</span>
                                    </div>

                                    <div className="pt-4 border-t border-[var(--border)] flex justify-between items-center">
                                        <span className="text-[var(--text-secondary)] font-medium uppercase tracking-wider text-sm">
                                            Dette Fournisseur générée :
                                        </span>
                                        <span className={`text-2xl font-black ${remainingDebt > 0 ? 'text-warning-400' : 'text-success-400'}`}>
                                            {remainingDebt.toLocaleString()} DZD
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </form>

                {/* Footer */}
                <div className="p-6 border-t border-[var(--border)] bg-[var(--bg-panel)] shrink-0 flex gap-3">
                    <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={isLoading}>
                        Annuler
                    </Button>
                    <Button type="submit" onClick={handleSubmit} className="flex-1" disabled={isLoading || lines.length === 0}>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Enregistrer la Facture & Mettre à jour le stock
                    </Button>
                </div>
            </div>
        </div>
    );
}
