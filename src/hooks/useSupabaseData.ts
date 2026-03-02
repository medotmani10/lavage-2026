import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';

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
                    // Fetch from Supabase
                    const { data: supaData, error: supaError } = await supabase.from(tableName).select('*');

                    if (supaError) {
                        throw supaError;
                    }

                    if (mounted) {
                        setData(supaData as T[]);
                        // Silently cache to Dexie
                        if (supaData && (db as any)[tableName]) {
                            (db as any)[tableName].bulkPut(supaData).catch(console.error);
                        }
                    }
                } else {
                    // Fallback to local Dexie cache if offline
                    setIsOffline(true);
                    if ((db as any)[tableName]) {
                        const localData = await (db as any)[tableName].toArray();
                        if (mounted) setData(localData);
                    }
                }
            } catch (err: any) {
                console.error(`Error fetching data for ${tableName}:`, err);
                if (mounted) {
                    setError(err);
                    setIsOffline(true);
                    // Try to fall back to Dexie if Supabase call failed
                    if ((db as any)[tableName]) {
                        const localData = await (db as any)[tableName].toArray();
                        setData(localData);
                    }
                }
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        fetchData();

        // Listen for realtime updates to trigger a re-fetch
        const handleSyncUpdate = () => {
            // For now, re-fetch entirely. (Could be optimized to just update state)
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
