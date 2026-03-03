import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface AppSettings {
    id?: string;
    station_name: string;
    phone?: string;
    address?: string;
    rc?: string;
    nif?: string;
    logo_url?: string;
    opening_time: string;
    closing_time: string;
    working_days: string[];
}

interface SettingsState {
    settings: AppSettings | null;
    isLoading: boolean;
    error: string | null;
    fetchSettings: () => Promise<void>;
    updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
}

const defaultSettings: AppSettings = {
    station_name: 'Lavage Vida',
    opening_time: '08:00',
    closing_time: '20:00',
    working_days: ['Samedi', 'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi'],
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
    settings: null,
    isLoading: false,
    error: null,

    fetchSettings: async () => {
        set({ isLoading: true, error: null });
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any)
                .from('app_settings')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            set({ settings: data || defaultSettings, isLoading: false });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error('Error fetching settings:', error);
            set({ error: msg, isLoading: false });
        }
    },

    updateSettings: async (newSettings) => {
        set({ isLoading: true, error: null });
        try {
            const currentSettings = get().settings || defaultSettings;
            const id = currentSettings.id;

            let res;
            if (id) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                res = await (supabase as any)
                    .from('app_settings')
                    .update(newSettings)
                    .eq('id', id)
                    .select()
                    .single();
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                res = await (supabase as any)
                    .from('app_settings')
                    .insert([{ ...newSettings }])
                    .select()
                    .single();
            }

            if (res.error) throw res.error;

            set({ settings: res.data, isLoading: false });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error('Error updating settings:', error);
            set({ error: msg, isLoading: false });
            throw error;
        }
    },
}));
