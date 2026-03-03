/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { queueOperation } from '../lib/sync';
import { showAlert } from '../stores/useDialogStore';
import { Button } from './Button';
import { Input } from './Input';
import { X, DollarSign, User, FileText } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';

interface CollectDebtModalProps {
    customerId?: string; // Pre-select if opened from a specific customer
    onClose: () => void;
}

export function CollectDebtModal({ customerId, onClose }: CollectDebtModalProps) {
    const { user } = useAuthStore();
    const { data: customers } = useSupabaseData<any>('customers');
    const { data: debts } = useSupabaseData<any>('debts');

    const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customerId || '');
    const [amount, setAmount] = useState<number | ''>('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const indebtedCustomers = customers.filter(c => c.current_balance > 0);
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

    useEffect(() => {
        if (customerId) {
            setSelectedCustomerId(customerId);
        }
    }, [customerId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const paidAmount = Number(amount);

        if (!selectedCustomerId || paidAmount <= 0) {
            showAlert('Veuillez sélectionner un client et entrer un montant valide.', 'warning');
            return;
        }

        if (!selectedCustomer) return;

        if (paidAmount > selectedCustomer.current_balance) {
            showAlert(`Le montant saisi (${paidAmount} DA) est supérieur à la dette du client (${selectedCustomer.current_balance} DA).`, 'warning');
            return;
        }

        setIsLoading(true);
        try {
            const now = new Date().toISOString();

            // 1. Create a logical ticket reference for this payment
            // Actually, we don't necessarily need a ticket_id for a pure debt collection loosely mapped to old tickets.
            // But we do need to record a payment and a financial transaction.

            // 2. Reduce debt from oldest to newest
            let remainingToDistribute = paidAmount;
            const customerDebts = debts
                .filter(d => d.customer_id === selectedCustomerId && d.status !== 'paid')
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            for (const debt of customerDebts) {
                if (remainingToDistribute <= 0) break;

                const payableOnThisDebt = Math.min(debt.remaining_amount, remainingToDistribute);
                remainingToDistribute -= payableOnThisDebt;

                const newPaidAmount = debt.paid_amount + payableOnThisDebt;
                const newRemaining = debt.remaining_amount - payableOnThisDebt;
                const newStatus = newRemaining <= 0 ? 'paid' : 'partial';

                await queueOperation('debts', 'UPDATE', {
                    ...debt,
                    paid_amount: newPaidAmount,
                    remaining_amount: newRemaining,
                    status: newStatus,
                    updated_at: now
                });
            }

            // 3. Update customer total balance
            await queueOperation('customers', 'UPDATE', {
                ...selectedCustomer,
                current_balance: selectedCustomer.current_balance - paidAmount,
                updated_at: now
            });

            // 4. Record Financial Transaction (Revenue)
            await queueOperation('financial_transactions', 'INSERT', {
                id: crypto.randomUUID(),
                type: 'revenue',
                amount: paidAmount,
                description_fr: `Recouvrement créance client : ${selectedCustomer.full_name}`,

                reference_type: 'customer_debt',
                reference_id: selectedCustomerId,
                created_by: user?.id || null,
                created_at: now
            });

            // 5. Record Payment
            await queueOperation('payments', 'INSERT', {
                id: crypto.randomUUID(),
                ticket_id: null, // Since this might cover multiple old tickets
                customer_id: selectedCustomerId,
                amount: paidAmount,
                payment_method: paymentMethod,
                reference_number: `REC-${Date.now().toString().slice(-6)}`,
                notes: notes,
                created_at: now
            });

            showAlert('Recouvrement enregistré avec succès.', 'success');
            onClose();
        } catch (error) {
            console.error('Error collecting debt:', error);
            showAlert('Une erreur est survenue lors de l\'enregistrement.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-lg)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-success-500/10">
                    <h2 className="text-xl font-bold text-success-500 flex items-center gap-2">
                        <DollarSign className="w-6 h-6" />
                        Recouvrement Client
                    </h2>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {!customerId && (
                        <div>
                            <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                                <User className="w-4 h-4 text-primary-400" />
                                Sélectionner un client endetté
                            </label>
                            <select
                                value={selectedCustomerId}
                                onChange={(e) => {
                                    setSelectedCustomerId(e.target.value);
                                    setAmount(''); // Reset amount when changing customer
                                }}
                                className="w-full px-4 py-3 bg-[var(--bg-base)] border border-[var(--border-lg)] rounded-xl text-white focus:ring-2 focus:ring-primary-500 outline-none"
                                required
                            >
                                <option value="" disabled>-- Choisir un client --</option>
                                {indebtedCustomers.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.full_name} ({c.current_balance.toLocaleString()} DA)
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {selectedCustomer && (
                        <div className="p-4 rounded-xl bg-[var(--bg-base)] border border-warning-500/30">
                            <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Dette totale actuelle:</p>
                            <p className="text-2xl font-black text-warning-400">{selectedCustomer.current_balance.toLocaleString()} DA</p>
                        </div>
                    )}

                    <Input
                        label="Montant encaissé (DA)"
                        type="number"
                        min="1"
                        max={selectedCustomer ? selectedCustomer.current_balance : undefined}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                        required
                        disabled={!selectedCustomerId}
                    />

                    <div>
                        <label className="block text-sm font-bold text-white mb-2">Mode d'encaissement</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('cash')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold border transition-colors ${paymentMethod === 'cash' ? 'bg-primary-500 text-white border-primary-500' : 'bg-[var(--bg-base)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--border-heavy)]'}`}
                            >
                                Espèces
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('card')}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold border transition-colors ${paymentMethod === 'card' ? 'bg-primary-500 text-white border-primary-500' : 'bg-[var(--bg-base)] text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--border-heavy)]'}`}
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
                            placeholder="Détails de l'opération..."
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                            Annuler
                        </Button>
                        <Button type="submit" variant="success" className="flex-1" isLoading={isLoading} disabled={!selectedCustomerId || !amount}>
                            Valider
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
