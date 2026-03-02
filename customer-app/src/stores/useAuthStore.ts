import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Customer } from '../types';

interface AuthState {
    user: User | null;
    customer: Customer | null;
    isLoading: boolean;
    isInitialized: boolean;
    setUser: (user: User | null) => void;
    setCustomer: (customer: Customer | null) => void;
    initialize: () => Promise<void>;
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    customer: null,
    isLoading: true,
    isInitialized: false,

    setUser: (user) => set({ user }),
    setCustomer: (customer) => set({ customer }),

    initialize: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                set({ user: session.user });

                // Fetch linked customer profile
                const { data: customerData } = await supabase
                    .from('customers')
                    .select('*')
                    .eq('auth_id', session.user.id)
                    .single();

                if (customerData) set({ customer: customerData as Customer });
            }

            // Listen for auth changes
            supabase.auth.onAuthStateChange(async (event, session) => {
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    set({ user: session?.user || null });
                    if (session?.user) {
                        const { data: customerData } = await supabase
                            .from('customers')
                            .select('*')
                            .eq('auth_id', session.user.id)
                            .single();
                        if (customerData) set({ customer: customerData as Customer });
                    }
                } else if (event === 'SIGNED_OUT') {
                    set({ user: null, customer: null });
                }
            });

        } catch (error) {
            console.error('Failed to initialize auth:', error);
        } finally {
            set({ isLoading: false, isInitialized: true });
        }
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, customer: null });
    }
}));
