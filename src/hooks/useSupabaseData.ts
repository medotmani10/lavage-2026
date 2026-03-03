import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useSupabaseData<T>(tableName: string, defaultData: T[] = []) {
    const [data, setData] = useState<T[]>(defaultData);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    useEffect(() => {
        let mounted = true;

        const fetchData = async () => {
            if (!mounted) return;
            setIsLoading(true);
            setError(null);

            try {
                if (navigator.onLine) {
                    setIsOffline(false);
                    const { data: supaData, error: supaError } = await supabase.from(tableName).select('*');

                    if (supaError) {
                        throw supaError;
                    }

                    if (mounted && supaData) {
                        setData(supaData as T[]);
                    }
                } else {
                    setIsOffline(true);
                    throw new Error("Offline, unable to fetch from Supabase");
                }
            } catch (err: any) {
                console.error(`Error fetching data for ${tableName}:`, err);
                if (mounted) {
                    setError(err);
                    setIsOffline(true);
                }
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        fetchData();

        // Listen for realtime updates from Supabase realtime, ignore local Dexie syncs
        const handleSyncUpdate = async () => {
            if (!mounted) return;
            fetchData();
        };

        const handleOffline = () => { if (mounted) setIsOffline(true); };
        const handleOnline = () => {
            if (mounted) {
                setIsOffline(false);
                fetchData();
            }
        };

        window.addEventListener('dexie-sync-update', handleSyncUpdate);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            mounted = false;
            window.removeEventListener('dexie-sync-update', handleSyncUpdate);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, [tableName]);

    return { data, isLoading, error, isOffline };
}
