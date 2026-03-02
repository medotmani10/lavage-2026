import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/useAuthStore';
import type { Vehicle, Ticket } from '../types';
import { CarFront, Wrench, AlertTriangle } from 'lucide-react';

export default function GaragePage() {
    const { customer, user } = useAuthStore();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [oilChanges, setOilChanges] = useState<Record<string, Ticket>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!customer?.id || !user?.id) return;

        const fetchVehiclesAndMaintenance = async () => {
            try {
                // 1. Fetch vehicles (RLS ensures we only get ones linked to this auth_id)
                const { data: vData, error: vError } = await supabase
                    .from('vehicles')
                    .select('*')
                    // Optional safety filter since RLS handles it, but good practice
                    .eq('customer_id', customer.id)
                    .order('created_at', { ascending: false });

                if (vError) throw vError;
                setVehicles(vData as Vehicle[] || []);

                if (vData && vData.length > 0) {
                    const vIds = vData.map(v => v.id);

                    // 2. Fetch the latest completed vidange ticket for each vehicle
                    // Optimization: We could use a lateral join or RPC, but since a customer rarely has >3 cars, 
                    // a single query ordered by date is fine.
                    const { data: tData, error: tError } = await supabase
                        .from('queue_tickets')
                        .select('*')
                        .in('vehicle_id', vIds)
                        .eq('requested_service', 'vidange')
                        .eq('status', 'completed')
                        .not('current_mileage', 'is', null)
                        .not('next_oil_change', 'is', null)
                        .order('completed_at', { ascending: false });

                    if (tError) throw tError;

                    // Process: Keep only the most recent one per vehicle
                    const latestVidanges: Record<string, Ticket> = {};
                    if (tData) {
                        tData.forEach((ticket: any) => {
                            if (ticket.vehicle_id && !latestVidanges[ticket.vehicle_id]) {
                                latestVidanges[ticket.vehicle_id] = ticket as Ticket;
                            }
                        });
                    }
                    setOilChanges(latestVidanges);
                }
            } catch (err) {
                console.error('Error fetching garage data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchVehiclesAndMaintenance();
    }, [customer?.id, user?.id]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-48">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
                    <CarFront className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Mon Garage</h2>
            </div>

            {vehicles.length === 0 ? (
                <div className="bg-[var(--bg-panel)] border border-dashed border-[var(--border-heavy)] rounded-[32px] p-8 text-center">
                    <CarFront className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4 opacity-50" />
                    <h3 className="text-white font-bold mb-2">Aucun véhicule</h3>
                    <p className="text-sm text-[var(--text-muted)]">Vos véhicules apparaîtront ici dès votre premier passage à la station.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {vehicles.map(vehicle => {
                        const lastVidange = oilChanges[vehicle.id];

                        // Note: In a real app with OBD2, current_mileage would be dynamic.
                        // Here we assume the user checks their dashboard, we just show what's recorded.
                        // A feature could be added to let user manually input current mileage.

                        return (
                            <div key={vehicle.id} className="bg-[var(--bg-panel)] border border-[var(--border-medium)] rounded-[24px] p-5 relative overflow-hidden group">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-lg font-black text-white">{vehicle.make} {vehicle.model}</h3>
                                        <div className="inline-block px-3 py-1 mt-1 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-lg">
                                            <p className="text-sm font-bold text-[var(--text-secondary)] tracking-widest uppercase">{vehicle.plate_number}</p>
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-[var(--bg-surface)] flex items-center justify-center">
                                        <CarFront className="w-5 h-5 text-[var(--text-muted)]" />
                                    </div>
                                </div>

                                {/* Maintenance Section */}
                                {lastVidange ? (
                                    <div className="bg-[var(--bg-surface)] rounded-xl p-4 border border-[var(--border-light)] mt-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <Wrench className="w-4 h-4 text-blue-400" />
                                                <span className="text-sm font-semibold text-white">Suivi Vidange</span>
                                            </div>
                                            <span className="text-xs text-[var(--text-muted)]">
                                                Fait le: {new Date(lastVidange.completed_at!).toLocaleDateString('fr-DZ')}
                                            </span>
                                        </div>

                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-[var(--text-muted)]">Dernier relevé: <strong className="text-white">{lastVidange.current_mileage?.toLocaleString()} km</strong></span>
                                            <span className="text-blue-400 font-bold">Prochain: {lastVidange.next_oil_change?.toLocaleString()} km</span>
                                        </div>

                                        {/* Simple progression visual (Dummy assumption since we don't have real-time OBD here) */}
                                        <div className="w-full bg-[var(--bg-base)] h-2 rounded-full overflow-hidden mt-3">
                                            <div className="h-full bg-blue-500 rounded-full" style={{ width: '45%' }}></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4 flex items-center gap-3 text-sm text-[var(--text-muted)] p-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-light)]">
                                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                        Aucun historique de vidange enregistré.
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
