import { useState } from 'react';
import { X, Car, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { queueOperation } from '../lib/sync';
import type { QueueTicket } from '../types';

interface GuestConversionModalProps {
    ticket: QueueTicket;
    onConverted: () => void;
    onClose: () => void;
}

export function GuestConversionModal({ ticket, onConverted, onClose }: GuestConversionModalProps) {
    const [plate, setPlate] = useState('');
    const [brand, setBrand] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    const handleConvert = async () => {
        if (!plate.trim() || !brand.trim()) {
            setError('La plaque et la marque sont obligatoires.');
            return;
        }
        setError('');
        setIsProcessing(true);

        try {
            const phone = ticket.guest_phone || `KIOSK-${Date.now()}`;
            const full_name = ticket.guest_name || 'Client Kiosque';

            // 1. Find or create customer
            let customerId: string;
            const { data: existing } = await (supabase.from('customers') as any).select('id').eq('phone', phone).maybeSingle();
            if (existing?.id) {
                customerId = existing.id as string;
            } else {
                const { data: newCust, error: ce } = await (supabase.from('customers') as any)
                    .insert({ full_name, phone, credit_limit: 0, current_balance: 0, loyalty_points: 0 })
                    .select('id').maybeSingle();
                if (ce) throw ce;
                if (!newCust?.id) throw new Error('Customer creation failed');
                customerId = newCust.id as string;
                // Only use Supabase now
            }

            // 2. Create vehicle
            const { data: newVehicle, error: ve } = await (supabase.from('vehicles') as any)
                .insert({ customer_id: customerId, plate_number: plate.trim().toUpperCase(), brand: brand.trim(), model: 'Inconnu', year: new Date().getFullYear() })
                .select('id').maybeSingle();
            if (ve) throw ve;
            if (!newVehicle?.id) throw new Error('Vehicle creation failed');
            const vehicleId = newVehicle.id as string;

            // 3. Update ticket: set customer_id, vehicle_id and clear guest fields
            await queueOperation('queue_tickets', 'UPDATE', {
                ...ticket,
                customer_id: customerId,
                vehicle_id: vehicleId,
                guest_name: null,
                guest_phone: null,
                // keep requested_service for Vidange card, will be used in PaymentModal
            });

            onConverted();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Une erreur est survenue.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-lg)] rounded-2xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)] bg-orange-500/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                            <Car className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <h2 className="font-bold text-white text-sm">Enregistrer le Client</h2>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">Ticket visiteur #{ticket.ticket_number}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div className="bg-orange-500/5 border border-orange-500/15 rounded-xl p-4">
                        <p className="text-sm font-semibold text-orange-400 mb-1">Visiteur Kiosque</p>
                        <p className="text-white font-bold">{ticket.guest_name || '—'}</p>
                        <p className="text-xs text-[var(--text-muted)]">{ticket.guest_phone || 'Téléphone non fourni'}</p>
                    </div>

                    <p className="text-sm text-[var(--text-secondary)]">Pour commencer la prestation, veuillez enregistrer la plaque et la marque du véhicule.</p>

                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
                                Plaque d'immatriculation *
                            </label>
                            <input
                                type="text"
                                value={plate}
                                onChange={e => setPlate(e.target.value.toUpperCase())}
                                placeholder="Ex: 123-456-07"
                                className="w-full bg-[var(--bg-panel)] border border-[var(--border-lg)] rounded-xl px-4 py-3 text-white font-mono font-bold text-sm outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 transition-all uppercase placeholder:normal-case placeholder:font-normal"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
                                Marque du Véhicule *
                            </label>
                            <input
                                type="text"
                                value={brand}
                                onChange={e => setBrand(e.target.value)}
                                placeholder="Ex: Toyota, Dacia, Renault..."
                                className="w-full bg-[var(--bg-panel)] border border-[var(--border-lg)] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 transition-all"
                            />
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                            ⚠️ {error}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 grid grid-cols-2 gap-3">
                    <button onClick={onClose} className="py-3 px-4 rounded-xl border border-[var(--border-lg)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] text-sm font-bold transition-all">
                        Annuler
                    </button>
                    <button
                        onClick={handleConvert}
                        disabled={!plate.trim() || !brand.trim() || isProcessing}
                        className="py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-all flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <CheckCircle className="w-4 h-4" />
                        )}
                        Enregistrer & Continuer
                    </button>
                </div>
            </div>
        </div>
    );
}
