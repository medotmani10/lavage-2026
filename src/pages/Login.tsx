import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Mail, Lock, AlertCircle, Wrench, Droplets, Gauge } from 'lucide-react';
import type { User } from '../types';

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setUser, setLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If the store already has an authenticated user (from persist)
    if (useAuthStore.getState().isAuthenticated) {
      navigate('/dashboard');
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          let userData: any = null;
          if (navigator.onLine) {
            try {
              const { data } = await supabase.from('users').select('*').eq('id', session.user.id).single();
              if (data) {
                userData = data;
              }
            } catch (e) { console.error("Error fetching user data on auth change:", e) }
          }
          if (userData) {
            setUser(userData as any as User);
            setLoading(false);
            navigate('/dashboard');
          }
        }
        if (event === 'SIGNED_OUT') { setUser(null); setLoading(false); }
      }
    );
    return () => { subscription.unsubscribe(); };
  }, [navigate, setUser, setLoading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);



    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      if (data.user && data.session) {
        let userData: any = null;
        if (navigator.onLine) {
          try {
            const { data: uData, error: userError } = await supabase
              .from('users').select('*').eq('id', data.user.id).single();
            if (userError) throw userError;
            if (uData) {
              userData = uData;
            }
          } catch (e) {
            console.error('Fetch user error', e);
          }
        }
        if (!userData) throw new Error('User profile not found.');

        setUser(userData as any as User);
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      console.error("Login error:", err);
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        setError("Vous êtes hors ligne. Veuillez utiliser le mode 'Connexion Locale (PIN)'.");
      } else {
        setError(err instanceof Error ? err.message : t('auth.loginError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: Gauge, label: 'File d\'attente en temps réel' },
    { icon: Droplets, label: 'Gestion lavage & vidange' },
    { icon: Wrench, label: 'Suivi inventaire & employés' },
  ];

  return (
    <div className="min-h-screen flex bg-[var(--bg-base)]">
      {/* ── Left Panel: Branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden bg-gradient-to-br from-[#0d1b2e] via-[var(--bg-base)] to-[#0d1b2e] border-r border-[var(--border)]">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, var(--border) 0px, var(--border) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, var(--border) 0px, var(--border) 1px, transparent 1px, transparent 40px)',
        }} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#3b82f6]/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-16">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-600 shadow-[var(--shadow-glow-orange)]">
              <Wrench className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide">Lavage & Vidange</h1>
              <p className="text-sm font-medium text-[var(--text-muted)] tracking-widest">ERP 2026</p>
            </div>
          </div>

          <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-tight">
            Gérez votre station<br />
            <span className="text-gradient">avec précision</span>
          </h2>
          <p className="text-lg mb-12 text-[var(--text-secondary)] max-w-md leading-relaxed">
            Système de gestion complet pour stations de lavage et vidange automobile.
          </p>

          {/* Feature list */}
          <div className="space-y-5">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-primary-500/10 border border-primary-500/20">
                  <f.icon className="w-5 h-5 text-primary-500" />
                </div>
                <span className="text-base font-medium text-[var(--text-secondary)]">
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <div className="flex gap-3 flex-wrap">
            {['Temps réel', 'Multi-rôles', 'Sécurisé', 'Bilingue'].map((tag) => (
              <span
                key={tag}
                className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-[var(--bg-panel)] border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wide"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel: Login Form ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary-500 to-primary-600">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Lavage & Vidange</h1>
              <p className="text-[10px] text-[var(--text-muted)] uppercase">ERP 2026</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Bienvenue</h2>
            <p className="text-[var(--text-muted)]">
              Entrez vos identifiants pour accéder au système
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl mb-6 bg-danger-500/10 border border-danger-500/20 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-danger-400 flex-shrink-0" />
              <p className="text-sm text-danger-400 font-medium leading-relaxed">{error}</p>
            </div>
          )}



          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">

            <>
              <Input
                label="Adresse email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@lavage-vida.com"
                required
                icon={<Mail className="w-5 h-5" />}
                disabled={isLoading}
              />
              <Input
                label="Mot de passe"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                icon={<Lock className="w-5 h-5" />}
                disabled={isLoading}
              />

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-[var(--border-lg)] bg-[var(--bg-panel)] text-primary-500 focus:ring-primary-500 focus:ring-offset-0 transition-all cursor-pointer"
                  />
                  <span className="text-sm text-[var(--text-secondary)] group-hover:text-white transition-colors">
                    Se souvenir de moi
                  </span>
                </label>
                <button
                  type="button"
                  className="text-sm font-medium text-primary-500 hover:text-primary-400 transition-colors"
                >
                  Mot de passe oublié?
                </button>
              </div>
            </>


            <Button
              type="submit"
              size="lg"
              className="w-full mt-4 h-12 text-base"
              isLoading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Connexion en cours...' : 'Se connecter'}
            </Button>
          </form>

          {/* Demo creds */}
          <div className="mt-8 p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
            <p className="text-[10px] font-bold mb-3 text-primary-500 uppercase tracking-widest">
              Comptes de démonstration
            </p>
            <div className="space-y-2">
              {
                [
                  { role: 'Admin', email: 'admin@lavage-vida.com', pass: 'Admin@123456' },
                ].map((c) => (
                  <div key={c.role} className="flex items-center justify-between group">
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">
                      {c.role}: <span className="text-[var(--text-muted)] font-normal">{c.email}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => { setEmail(c.email); setPassword(c.pass); }}
                      className="text-[11px] font-bold text-primary-500/70 group-hover:text-primary-400 transition-colors px-2 py-1 rounded bg-primary-500/10"
                    >
                      Utiliser →
                    </button>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
