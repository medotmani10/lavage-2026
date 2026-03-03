/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { queueOperation } from '../lib/sync';
import { showAlert } from '../stores/useDialogStore';
import { Button } from './Button';
import { Input } from './Input';
import { X, Truck, FileText, ArrowUpRight } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';

interface PaySupplierModalProps {
    supplierId?: string; // Pre-select if opened from a specific supplier
    onClose: () => void;
}

export function PaySupplierModal({ supplierId, onClose }: PaySupplierModalProps) {
    const { user } = useAuthStore();
    const { data: suppliers } = useSupabaseData<any>('suppliers');

    const [selectedSupplierId, setSelectedSupplierId] = useState<string>(supplierId || '');
    const [amount, setAmount] = useState<number | ''>('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const indebtedSuppliers = suppliers.filter(s => s.balance_owed > 0);
    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

    useEffect(() => {
        if (supplierId) {
            setSelectedSupplierId(supplierId);
        }
    }, [supplierId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const paidAmount = Number(amount);

        if (!selectedSupplierId || paidAmount <= 0) {
            showAlert('Veuillez sélectionner un fournisseur et entrer un montant valide.', 'warning');
            return;
        }

        if (!selectedSupplier) return;

        if (paidAmount > selectedSupplier.balance_owed) {
            showAlert(`Le montant saisi (${paidAmount} DA) est supérieur à la dette due au fournisseur (${selectedSupplier.balance_owed} DA).`, 'warning');
            return;
        }

        setIsLoading(true);
        try {
            const now = new Date().toISOString();

            // 1. Update supplier balance
            await queueOperation('suppliers', 'UPDATE', {
                ...selectedSupplier,
                balance_owed: selectedSupplier.balance_owed - paidAmount,
                updated_at: now
            });

            // 2. Record Financial Transaction (Expense)
            await queueOperation('financial_transactions', 'INSERT', {
                id: crypto.randomUUID(),
                type: 'expense',
                amount: paidAmount,
                description_fr: `Paiement fournisseur : ${selectedSupplier.company_name}`,
                description_ar: `دفع للمورد : ${selectedSupplier.company_name}`,
                reference_type: 'supplier_payment',
                reference_id: selectedSupplierId,
                created_by: user?.id || null,
                created_at: now
            });

            // Note: If we had a direct matching system for purchase_invoices we would update them here.
            // But since purchase invoices status management is abstract, reducing balance is generally enough.

            showAlert('Paiement fournisseur enregistré avec succès.', 'success');
            onClose();
        } catch (error) {
            console.error('Error paying supplier:', error);
            showAlert('Une erreur est survenue lors de l\'enregistrement.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-lg)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-danger-500/10">
                    <h2 className="text-xl font-bold text-danger-500 flex items-center gap-2">
                        <ArrowUpRight className="w-6 h-6" />
                        Paiement Fournisseur
                    </h2>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {!supplierId && (
                        <div>
                            <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                                <Truck className="w-4 h-4 text-primary-400" />
                                Sélectionner un fournisseur
                            </label>
                            <select
                                value={selectedSupplierId}
                                onChange={(e) => {
                                    setSelectedSupplierId(e.target.value);
                                    setAmount('');
                                }}
                                className="w-full px-4 py-3 bg-[var(--bg-base)] border border-[var(--border-lg)] rounded-xl text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                required
                            >
                                <option value="" disabled>-- Choisir un fournisseur --</option>
                                {indebtedSuppliers.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.company_name} ({s.balance_owed.toLocaleString()} DA)
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {selectedSupplier && (
                        <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-danger-500/30">
                            <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Dette à payer:</p>
                            <p className="text-2xl font-black text-danger-400">{selectedSupplier.balance_owed.toLocaleString()} DA</p>
                        </div>
                    )}

                    <Input
                        label="Montant réglé (DA)"
                        type="number"
                        min="1"
                        max={selectedSupplier ? selectedSupplier.balance_owed : undefined}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        required
                        disabled={!selectedSupplierId}
                    />

                    <div>
                        <label className="block text-sm font-bold text-white mb-2">Mode de paiement</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('cash')}
                                className={`flex-1 py-2 px-2 rounded-lg text-sm font-bold border transition-colors ${paymentMethod === 'cash' ? 'bg-primary-500 text-white border-primary-500' : 'bg-[var(--bg-base)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--border-heavy)]'}`}
                            >
                                Espèces
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('transfer')}
                                className={`flex-1 py-2 px-2 rounded-lg text-sm font-bold border transition-colors ${paymentMethod === 'transfer' ? 'bg-primary-500 text-white border-primary-500' : 'bg-[var(--bg-base)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--border-heavy)]'}`}
                            >
                                Virement
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('card')}
                                className={`flex-1 py-2 px-2 rounded-lg text-sm font-bold border transition-colors ${paymentMethod === 'card' ? 'bg-primary-500 text-white border-primary-500' : 'bg-[var(--bg-base)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--border-heavy)]'}`}
                            >
                                Carte
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Notes (Optionnel)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full px-4 py-3 bg-[var(--bg-base)] border border-[var(--border-lg)] rounded-xl text-white outline-none resize-none"
                            rows={2}
                            placeholder="Chèque N° ou Référence..."
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                            Annuler
                        </Button>
                        <Button type="submit" variant="danger" className="flex-1 shadow-lg shadow-danger-500/20" isLoading={isLoading} disabled={!selectedSupplierId || !amount}>
                            Enregistrer
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
