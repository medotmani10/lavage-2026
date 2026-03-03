/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { queueOperation } from '../lib/sync';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { X, Car, Plus, Trash2, Edit2, Wrench, Calendar, CheckCircle } from 'lucide-react';
import type { Customer, Vehicle } from '../types';
import { showConfirm } from '../stores/useDialogStore';

interface CustomerVehiclesPanelProps {
    customer: Customer;
    isOpen: boolean;
    onClose: () => void;
}

export function CustomerVehiclesPanel({ customer, isOpen, onClose }: CustomerVehiclesPanelProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [selectedVehicleForFiche, setSelectedVehicleForFiche] = useState<Vehicle | null>(null);

    const [formData, setFormData] = useState({
        plate_number: '',
        brand: '',
        model: '',
        year: new Date().getFullYear().toString(),
        color: '',
        notes: ''
    });

    const { data: rawVehicles } = useSupabaseData<any>('vehicles');
    const { data: rawTickets } = useSupabaseData<any>('queue_tickets');

    const vehicles = rawVehicles.filter(v => v.customer_id === customer?.id);

    const fiches = (!selectedVehicleForFiche?.id || !customer?.id)
        ? []
        : rawTickets
            .filter(t => t.customer_id === customer.id && t.vehicle_id === selectedVehicleForFiche.id && t.current_mileage != null)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (!isOpen || !customer) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingVehicle) {
            await queueOperation('vehicles', 'UPDATE', {
                ...editingVehicle,
                ...formData,
                year: parseInt(formData.year),
            });
        } else {
            await queueOperation('vehicles', 'INSERT', {
                id: crypto.randomUUID(),
                customer_id: customer.id,
                ...formData,
                year: parseInt(formData.year),
                odometer: 0,
                created_at: new Date().toISOString()
            });
        }

        setIsAdding(false);
        setEditingVehicle(null);
        setFormData({ plate_number: '', brand: '', model: '', year: new Date().getFullYear().toString(), color: '', notes: '' });
    };

    const handleDelete = async (vehicle: Vehicle) => {
        if (!(await showConfirm('Voulez-vous vraiment supprimer ce véhicule?'))) return;
        await queueOperation('vehicles', 'DELETE', vehicle as any);
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg bg-[var(--bg-surface)] h-full shadow-2xl flex flex-col transform transition-transform duration-300 translate-x-0">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[var(--border)] shrink-0 bg-[var(--bg-panel)]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-500/10 border border-primary-500/20 rounded-xl flex items-center justify-center">
                            <Car className="w-6 h-6 text-primary-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Véhicules</h2>
                            <p className="text-sm text-[var(--text-muted)]">{customer.full_name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-base)] rounded-xl transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray">
                    {!isAdding && !editingVehicle && !selectedVehicleForFiche ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-sm flex gap-2 items-center">
                                    Ses Véhicules ({vehicles?.length || 0})
                                </h3>
                                <Button size="sm" onClick={() => setIsAdding(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Ajouter
                                </Button>
                            </div>

                            {vehicles?.length === 0 ? (
                                <div className="text-center py-12 text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-xl">
                                    <Car className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>Aucun véhicule enregistré pour ce client.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {vehicles?.map(vehicle => (
                                        <Card key={vehicle.id} className="p-4 border-[var(--border)] bg-[var(--bg-base)] flex justify-between items-center group hover:border-primary-500/30">
                                            <div>
                                                <div className="inline-block bg-[var(--bg-panel)] border border-[var(--border-lg)] px-2 py-0.5 rounded text-sm font-mono font-bold text-white mb-2">
                                                    {vehicle.plate_number}
                                                </div>
                                                <p className="text-sm font-bold text-white">{vehicle.brand} {vehicle.model}</p>
                                                <p className="text-xs text-[var(--text-muted)]">{vehicle.year} {vehicle.color ? `· ${vehicle.color}` : ''}</p>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setSelectedVehicleForFiche(vehicle as any)} className="p-2 hover:bg-orange-500/10 rounded-lg text-orange-400" title="Fiches de Vidange">
                                                    <Wrench className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => {
                                                    setEditingVehicle(vehicle as any);
                                                    setFormData({
                                                        plate_number: vehicle.plate_number,
                                                        brand: vehicle.brand,
                                                        model: vehicle.model,
                                                        year: vehicle.year?.toString() || new Date().getFullYear().toString(),
                                                        color: vehicle.color || '',
                                                        notes: vehicle.notes || ''
                                                    });
                                                }} className="p-2 hover:bg-[var(--bg-hover)] rounded-lg text-gray-400 hover:text-white">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(vehicle as any)} className="p-2 hover:bg-danger-500/10 rounded-lg text-danger-400">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : selectedVehicleForFiche ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-6">
                                <button onClick={() => setSelectedVehicleForFiche(null)} className="text-[var(--text-muted)] hover:text-white pb-1">
                                    &larr; Retour
                                </button>
                                <h3 className="font-bold text-white flex-1 text-center flex items-center justify-center gap-2">
                                    <Wrench className="w-4 h-4 text-orange-400" />
                                    Fiches Vidange: {selectedVehicleForFiche.plate_number}
                                </h3>
                            </div>

                            {fiches === undefined ? (
                                <div className="text-center py-8">
                                    <div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto"></div>
                                </div>
                            ) : fiches.length === 0 ? (
                                <div className="text-center py-12 text-[var(--text-muted)] border border-dashed border-[var(--border)] rounded-xl">
                                    <Wrench className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>Aucune fiche de vidange trouvée pour ce véhicule.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {fiches.map((fiche: any) => (
                                        <Card key={fiche.id} className="p-5 border-[var(--border)] bg-[var(--bg-base)]">
                                            <div className="flex justify-between items-start mb-4 border-b border-[var(--border)] pb-3">
                                                <div>
                                                    <p className="text-sm font-bold text-white flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-primary-400" />
                                                        {new Date(fiche.created_at).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-xs text-[var(--text-muted)] mt-1">Ticket #{fiche.ticket_number}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Kilométrage</p>
                                                    <p className="font-mono font-bold text-white bg-[var(--bg-panel)] px-2 py-0.5 rounded mt-1 border border-[var(--border-lg)]">
                                                        {fiche.current_mileage?.toLocaleString()} km
                                                    </p>
                                                </div>
                                            </div>

                                            {fiche.next_oil_change && (
                                                <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex justify-between items-center">
                                                    <div>
                                                        <p className="text-xs font-bold text-green-400 uppercase tracking-wider">Prochain Changement</p>
                                                        <p className="font-black text-white">{fiche.next_oil_change.toLocaleString()} km</p>
                                                    </div>
                                                    <CheckCircle className="w-6 h-6 text-green-400 opacity-50" />
                                                </div>
                                            )}

                                            {fiche.filters_changed && fiche.filters_changed.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Filtres Remplacés</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {fiche.filters_changed.map((filterId: string) => (
                                                            <span key={filterId} className="text-xs font-medium px-2 py-1 bg-orange-500/10 text-orange-300 border border-orange-500/20 rounded-lg">
                                                                {filterId === 'oil' ? 'Huile' : filterId === 'air' ? 'Air' : filterId === 'fuel' ? 'Carburant' : filterId === 'cabin' ? 'Habitacle' : filterId}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center gap-3 mb-6">
                                <button onClick={() => { setIsAdding(false); setEditingVehicle(null); }} className="text-[var(--text-muted)] hover:text-white pb-1">
                                    &larr; Retour
                                </button>
                                <h3 className="font-bold text-white flex-1 text-center">
                                    {editingVehicle ? 'Modifier Véhicule' : 'Nouveau Véhicule'}
                                </h3>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Input
                                    label="Matricule"
                                    required
                                    value={formData.plate_number}
                                    onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                                    placeholder="EX: 12345 119 16"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Marque"
                                        required
                                        value={formData.brand}
                                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                        placeholder="Renault"
                                    />
                                    <Input
                                        label="Modèle"
                                        required
                                        value={formData.model}
                                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                        placeholder="Clio 4"
                                    />
                                    <Input
                                        label="Année"
                                        type="number"
                                        value={formData.year}
                                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                    />
                                    <Input
                                        label="Couleur"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    />
                                </div>
                                <Input
                                    label="Notes"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />

                                <div className="pt-4 border-t border-[var(--border)] flex justify-end gap-3">
                                    <Button type="button" variant="secondary" onClick={() => { setIsAdding(false); setEditingVehicle(null); }}>
                                        Annuler
                                    </Button>
                                    <Button type="submit">
                                        Enregistrer
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
