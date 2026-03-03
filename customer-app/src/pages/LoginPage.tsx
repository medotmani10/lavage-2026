/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';
import { ShieldCheck, ArrowLeft, Unlock } from 'lucide-react';

export default function LoginPage() {
    const navigate = useNavigate();
    const { isInitialized } = useAuthStore();
    const [phone, setPhone] = useState('');
    const [pin, setPin] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (phone.length < 9 || pin.length !== 4) {
            setError('Coordonnées invalides.');
            return;
        }

        setIsLoading(true);
        setError('');

        // Format phone to match dummy email strategy
        const dummyEmail = `${phone}@lavage.local`;

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: dummyEmail,
                password: pin, // PIN acts as password
            });

            if (authError) throw authError;

            // Successful login, useAuthStore listener will pick up the session
            navigate('/dashboard');

        } catch (err: any) {
            console.error(err);
            setError("Numéro de téléphone ou code PIN incorrect.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isInitialized) return null;

    return (
        <div className="min-h-screen flex flex-col px-4 py-8 sm:p-6 lg:p-12 relative overflow-hidden bg-[var(--bg-base)]">

            {/* Background decorations */}
            <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-primary-600/10 blur-[120px] rounded-full pointer-events-none"></div>

            <header className="w-full flex justify-start mb-10 z-10">
                <button
                    onClick={() => navigate('/')}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--bg-panel)] text-[var(--text-secondary)] hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
            </header>

            <main className="w-full max-w-sm mx-auto z-10 flex-1 flex flex-col justify-center">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary-500/10 border border-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck className="w-8 h-8 text-primary-400" />
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2">Espace Client</h1>
                    <p className="text-[var(--text-secondary)]">Connectez-vous pour voir vos points de fidélité et vos véhicules.</p>
                </div>

                <div className="bg-[var(--bg-panel)]/80 backdrop-blur-xl border border-[var(--border-medium)] rounded-[32px] p-6 sm:p-8 shadow-2xl">
                    <form onSubmit={handleLogin} className="space-y-5">

                        <Input
                            label="Numéro de Téléphone"
                            placeholder="Ex: 0550 12 34 56"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                        />

                        <Input
                            label="Code PIN (4 chiffres)"
                            placeholder="••••"
                            type="password"
                            maxLength={4}
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            required
                        />

                        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-center font-medium animate-fade-in">{error}</div>}

                        <Button type="submit" size="lg" className="w-full mt-2" isLoading={isLoading}>
                            <Unlock className="w-5 h-5 mr-1" /> Accéder à mon espace
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-[var(--text-muted)]">
                        <p>Le code PIN vous est remis à la caisse lors de votre première visite complétée.</p>
                    </div>
                </div>
            </main>

        </div>
    );
}
