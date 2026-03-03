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
                // 1. Immediately load whatever is in Dexie for an instant UI update
                if ((db as any)[tableName]) {
                    const localData = await (db as any)[tableName].toArray();
                    if (mounted) setData(localData);
                }

                // 2. Fetch fresh data from Supabase in the background
                if (navigator.onLine) {
                    setIsOffline(false);
                    const { data: supaData, error: supaError } = await supabase.from(tableName).select('*');

                    if (supaError) {
                        throw supaError;
                    }

                    if (mounted && supaData) {
                        // 3. Upsert fresh data into Dexie
                        if ((db as any)[tableName]) {
                            await (db as any)[tableName].bulkPut(supaData);
                            // 4. Reload from Dexie so we get a merged view of local (unsynced) + remote data
                            const mergedData = await (db as any)[tableName].toArray();
                            if (mounted) setData(mergedData);
                        } else {
                            // Fallback if no Dexie table config (unlikely)
                            if (mounted) setData(supaData as T[]);
                        }
                    }
                } else {
                    setIsOffline(true);
                }
            } catch (err: any) {
                console.error(`Error fetching data for ${tableName}:`, err);
                if (mounted) {
                    setError(err);
                    setIsOffline(true);
                    // Just rely on the Dexie data we fetched in step 1
                }
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        fetchData();

        // Listen for realtime or local updates to trigger a fast re-fetch from local Dexie cache
        const handleSyncUpdate = async () => {
            if (!mounted) return;
            // Since `queueOperation` and Supabase realtime put the fresh data inside Dexie,
            // we can just read from the local cache to update the UI instantly without a network request.
            if ((db as any)[tableName]) {
                const localData = await (db as any)[tableName].toArray();
                if (mounted) setData(localData);
            } else {
                fetchData();
            }
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
