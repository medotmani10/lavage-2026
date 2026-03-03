import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useSupabaseData<T>(tableName: string, defaultData: T[] = []) {
    const [data, setData] = useState<T[]>(defaultData);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    useEffect(() => {
        let mounted = true;

        const fetchData = async () => {
            if (!mounted) return;
            setIsLoading(true);
            setError(null);

            try {
                if (!navigator.onLine) {
                    setIsOffline(true);
                    throw new Error("Hors ligne — impossible de charger les données.");
                }

                setIsOffline(false);
                const { data: supaData, error: supaError } = await supabase
                    .from(tableName as string)
                    .select('*');

                if (supaError) throw supaError;
                if (mounted && supaData) setData(supaData as T[]);
            } catch (err: unknown) {
                if (mounted) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                    if (!navigator.onLine) setIsOffline(true);
                }
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        // Initial fetch
        fetchData();

        // ─── Supabase Realtime subscription (per-table) ─────────────────────
        // Each hook instance subscribes to changes on its specific table only.
        // When any row in this table changes (INSERT / UPDATE / DELETE),
        // we re-fetch fresh data immediately.
        const channelName = `realtime:${tableName}:${Math.random().toString(36).slice(2)}`;
        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: tableName },
                () => {
                    if (mounted) fetchData();
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`✅ Realtime subscribed: ${tableName}`);
                }
            });

        channelRef.current = channel;

        // ─── Network event listeners ─────────────────────────────────────────
        const handleOffline = () => { if (mounted) setIsOffline(true); };
        const handleOnline = () => {
            if (mounted) {
                setIsOffline(false);
                fetchData();
            }
        };

        // ─── Manual refresh event (for components that still use queueOperation) ─
        const handleManualUpdate = () => { if (mounted) fetchData(); };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        window.addEventListener('supabase-data-update', handleManualUpdate);

        return () => {
            mounted = false;
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('supabase-data-update', handleManualUpdate);
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [tableName]);

    return { data, isLoading, error, isOffline };
}
