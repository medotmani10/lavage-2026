import { useState } from 'react';
import { Wrench, CheckCircle } from 'lucide-react';
import { queueOperation } from '../lib/sync';
import type { QueueTicket } from '../types';

interface VidangeCardModalProps {
    ticket: QueueTicket;
    onSaved: () => void;
    onSkip: () => void;
}

const FILTER_OPTIONS = [
    { id: 'oil', label: 'Filtre à Huile' },
    { id: 'air', label: "Filtre à Air" },
    { id: 'fuel', label: 'Filtre à Carburant' },
    { id: 'cabin', label: 'Filtre d\'Habitacle' },
];

export function VidangeCardModal({ ticket, onSaved, onSkip }: VidangeCardModalProps) {
    const [mileage, setMileage] = useState<number | ''>('');
    const [checkedFilters, setCheckedFilters] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const nextOilChange = mileage !== '' ? mileage + 10000 : null;

    const toggleFilter = (id: string) => {
        setCheckedFilters(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    const handleSave = async () => {
        if (mileage === '' || isNaN(Number(mileage))) {
            setError('Veuillez entrer le kilométrage actuel.');
            return;
        }
        setError('');
        setIsSaving(true);

        try {
            await queueOperation('queue_tickets', 'UPDATE', {
                ...ticket,
                current_mileage: Number(mileage),
                next_oil_change: nextOilChange,
                filters_changed: checkedFilters,
            });
            onSaved();
        } catch (err: any) {
            setError(err.message || 'Erreur lors de la sauvegarde.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-lg)] rounded-2xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)] bg-orange-500/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                            <Wrench className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <h2 className="font-bold text-white text-sm">Fiche Vidange</h2>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">Ticket #{ticket.ticket_number}</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    <p className="text-sm text-[var(--text-secondary)]">
                        Enregistrez les données de la vidange pour l'archivage de la maintenance.
                    </p>

                    {/* Current Mileage */}
                    <div>
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 block">
                            Kilométrage Actuel (km) *
                        </label>
                        <input
                            type="number"
                            value={mileage}
                            onChange={e => setMileage(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Ex: 85000"
                            className="w-full bg-[var(--bg-panel)] border border-[var(--border-lg)] rounded-xl px-4 py-3 text-white font-bold text-sm outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 transition-all"
                            autoFocus
                        />
                    </div>

                    {/* Next Oil Change (read-only) */}
                    {nextOilChange !== null && (
                        <div className="flex items-center justify-between p-4 bg-green-500/5 border border-green-500/15 rounded-xl">
                            <div>
                                <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-0.5">Prochain changement d'huile</p>
                                <p className="text-2xl font-black text-white">{nextOilChange.toLocaleString()} km</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-green-400" />
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div>
                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3 block">
                            Filtres remplacés
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {FILTER_OPTIONS.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => toggleFilter(opt.id)}
                                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all text-left ${checkedFilters.includes(opt.id)
                                        ? 'bg-orange-500/10 border-orange-500/40 text-orange-300'
                                        : 'bg-[var(--bg-panel)] border-[var(--border-lg)] text-[var(--text-secondary)] hover:border-orange-500/20 hover:text-white'
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checkedFilters.includes(opt.id) ? 'bg-orange-500 border-orange-500' : 'border-[var(--border-lg)]'
                                        }`}>
                                        {checkedFilters.includes(opt.id) && <CheckCircle className="w-3 h-3 text-white" />}
                                    </div>
                                    {opt.label}
                                </button>
                            ))}
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
                    <button
                        onClick={onSkip}
                        className="py-3 px-4 rounded-xl border border-[var(--border-lg)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] text-sm font-bold transition-all"
                    >
                        Passer
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={mileage === '' || isSaving}
                        className="py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-all flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <CheckCircle className="w-4 h-4" />
                        )}
                        Enregistrer & Encaisser
                    </button>
                </div>
            </div>
        </div>
    );
}
