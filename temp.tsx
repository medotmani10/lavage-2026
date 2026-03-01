import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, type Ticket, type Service } from './supabase';
import {
    Car, Droplets, Sparkles, Zap, CheckCircle, Clock, Hash,
    Phone, User, Ticket as TicketIcon, RefreshCw,
    Star, ShieldCheck, Award, Wrench, Wind, ChevronDown, Bell,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SERVICE_ICONS = [Droplets, Sparkles, Zap, Car, ShieldCheck, Wind, Wrench, Star, Award];
const SERVICE_COLORS = [
    'from-blue-500/20 to-cyan-500/10',
    'from-orange-500/20 to-amber-500/10',
    'from-purple-500/20 to-violet-500/10',
    'from-emerald-500/20 to-green-500/10',
    'from-rose-500/20 to-red-500/10',
    'from-sky-500/20 to-blue-500/10',
    'from-yellow-500/20 to-amber-500/10',
    'from-pink-500/20 to-rose-500/10',
];
const SERVICE_ICON_COLORS = ['#38bdf8', '#f97316', '#a78bfa', '#4ade80', '#fb7185', '#7dd3fc', '#fbbf24', '#f472b6'];

// ─── Styled Components ────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  
  :root {
    --bg: #050508;
    --surface: rgba(255,255,255,0.04);
    --surface2: rgba(255,255,255,0.07);
    --border: rgba(255,255,255,0.08);
    --border2: rgba(255,255,255,0.14);
    --text: #ffffff;
    --text2: rgba(255,255,255,0.6);
    --text3: rgba(255,255,255,0.35);
    --accent: #f97316;
    --accent2: #f59e0b;
    --glow: rgba(249,115,22,0.25);
    --radius: 20px;
    --radius-sm: 12px;
  }

  html { scroll-behavior: smooth; }
  body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; overflow-x: hidden; }

  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 var(--glow); }
    50% { box-shadow: 0 0 30px 0 var(--glow); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes slide-in {
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes alert-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.03); opacity: 0.92; }
  }
  @keyframes ring-shake {
    0%, 100% { transform: rotate(0deg); }
    15% { transform: rotate(-15deg); }
    30% { transform: rotate(15deg); }
    45% { transform: rotate(-10deg); }
    60% { transform: rotate(10deg); }
    75% { transform: rotate(-5deg); }
    90% { transform: rotate(5deg); }
  }
  .alert-pulse { animation: alert-pulse 1.5s ease-in-out infinite; }



  .fade-up { animation: fade-up 0.5s ease forwards; }
  .slide-in { animation: slide-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
  .float { animation: float 3s ease-in-out infinite; }
  .spin { animation: spin 1s linear infinite; }
  .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }

  .glass {
    background: var(--surface);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid var(--border);
  }
  .glass-strong {
    background: rgba(255,255,255,0.06);
    backdrop-filter: blur(40px);
    border: 1px solid var(--border2);
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 99px; }

  input {
    width: 100%;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 14px 16px;
    color: var(--text);
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    font-weight: 500;
    outline: none;
    transition: all 0.2s;
  }
  input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(249,115,22,0.15); }
  input::placeholder { color: var(--text3); font-weight: 400; }

  .btn-primary {
    background: linear-gradient(135deg, #f97316, #f59e0b);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    padding: 15px 28px;
    font-weight: 800;
    font-size: 15px;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s;
    box-shadow: 0 4px 20px rgba(249,115,22,0.35);
  }
  .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(249,115,22,0.5); }
  .btn-primary:active:not(:disabled) { transform: translateY(0px); }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

  .btn-ghost {
    background: transparent;
    color: var(--text2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 14px 20px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    transition: all 0.2s;
  }
  .btn-ghost:hover { background: var(--surface2); border-color: var(--border2); color: var(--text); }

  .service-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 24px 20px;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    cursor: default;
  }
  .service-card:hover {
    transform: translateY(-6px);
    border-color: rgba(249,115,22,0.3);
    box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(249,115,22,0.1);
  }

  .label { font-size: 11px; font-weight: 700; color: var(--accent); letter-spacing: 0.15em; text-transform: uppercase; }
`;

// ─── Queue Display Bar ────────────────────────────────────────────────────────
function QueueBar({ currentServing, pending }: { currentServing: Ticket | undefined; pending: Ticket[] }) {
    return (
        <div style={{ background: 'linear-gradient(90deg, rgba(249,115,22,0.12), rgba(245,158,11,0.06))', borderBottom: '1px solid rgba(249,115,22,0.15)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>En service :</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#f97316' }}>
                    {currentServing ? `#${currentServing.ticket_number}` : '—'}
                </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={13} color="rgba(255,255,255,0.4)" />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                    {pending.length === 0 ? 'Aucune attente' : `${pending.length} véhicule${pending.length > 1 ? 's' : ''} en attente`}
                </span>
            </div>
        </div>
    );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, children, icon }: { label: string; children: React.ReactNode; icon?: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {icon && <span style={{ color: 'var(--accent)', opacity: 0.7 }}>{icon}</span>}
                <label style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</label>
            </div>
            {children}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function KioskPage() {
    const [step, setStep] = useState<'home' | 'form' | 'ticket'>('home');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [plate, setPlate] = useState('');
    const [brand, setBrand] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [myTicket, setMyTicket] = useState<{ number: string; position: number } | null>(null);
    const [now, setNow] = useState(new Date());
    const [activeTickets, setActiveTickets] = useState<Ticket[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [mobileQueueOpen, setMobileQueueOpen] = useState(false);
    const [turnAlert, setTurnAlert] = useState(false);
    const alertFiredRef = useRef(false); // ensures chime plays only once

    // ── Play a chime via Web Audio API (no audio file needed) ──
    const playChime = useCallback(() => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.value = freq;
                const t = ctx.currentTime + i * 0.18;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.4, t + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
                osc.start(t);
                osc.stop(t + 0.5);
            });
        } catch (e) {
            console.warn('Audio not available', e);
        }
    }, []);

    useEffect(() => { const iv = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(iv); }, []);

    useEffect(() => {
        supabase.from('services').select('*').eq('active', true).order('name')
            .then(({ data }) => { if (data) setServices(data as Service[]); });
    }, []);

    useEffect(() => {
        const load = async () => {
            const { data } = await supabase.from('queue_tickets')
                .select('id, ticket_number, status, created_at')
                .in('status', ['pending', 'in_progress']).order('created_at');
            if (data) setActiveTickets(data as Ticket[]);
        };
        load();
        const ch = supabase.channel('kiosk-queue').on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tickets' }, load).subscribe();
        return () => { supabase.removeChannel(ch); };
    }, []);

    const currentServing = activeTickets.find(t => t.status === 'in_progress');
    const pending = activeTickets.filter(t => t.status === 'pending');

    // ── Detect when only 1 car is left before the customer's turn ──
    useEffect(() => {
        if (!myTicket || step !== 'ticket') return;
        const pendingNumbers = pending.map(t => t.ticket_number);
        const myIndex = pendingNumbers.indexOf(myTicket.number);
        // myIndex === 0 means they are next (no car before them)
        // myIndex === 1 means exactly 1 car before them
        if ((myIndex === 0 || myIndex === 1) && !alertFiredRef.current) {
            alertFiredRef.current = true;
            setTurnAlert(true);
            playChime();
        }
    }, [activeTickets, myTicket, step, pending, playChime]);

    const handleGetTicket = useCallback(async () => {
        if (!name.trim() || !plate.trim() || !brand.trim()) return;
        setIsSubmitting(true);
        try {
            const { data: ticketNumber, error: rpcError } = await supabase.rpc('kiosk_create_ticket', {
                p_name: name.trim(),
                p_phone: phone.trim() || `KIOSK-${Date.now()}`,
                p_plate: plate.trim(),
                p_brand: brand.trim()
            });

            if (rpcError) throw rpcError;
            if (!ticketNumber) throw new Error('Ticket creation failed — no number returned from secure RPC');

            setMyTicket({ number: ticketNumber, position: pending.length + 1 });
            setStep('ticket');
        } catch (err) {
            console.error(err);
            alert('Une erreur est survenue. Veuillez réessayer.');
        } finally {
            setIsSubmitting(false);
        }
    }, [name, phone, plate, brand, pending]);

    const reset = () => {
        setStep('home');
        setMyTicket(null);
        setName('');
        setPhone('');
        setPlate('');
        setBrand('');
        setTurnAlert(false);
        alertFiredRef.current = false;
    };

    return (
        <>
            <style>{css}</style>
            <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>

                {/* ── TOP HEADER ── */}
                <header style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--border)', background: 'rgba(5,5,8,0.9)', backdropFilter: 'blur(20px)' }}>
                    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 64 }}>
                        {/* Logo */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #f97316, #ea580c)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(249,115,22,0.4)', flexShrink: 0 }}>
                                <Car size={20} color="white" />
                            </div>
                            <div>
                                <p style={{ fontWeight: 900, fontSize: 14, lineHeight: 1.1 }}>Lavage & Vidange</p>
                                <p style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Centre Pro</p>
                            </div>
                        </div>

                        {/* Clock */}
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                                {now.toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>
                                {now.toLocaleDateString('fr-DZ', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </p>
                        </div>
                    </div>

                    {/* Queue status bar */}
                    <QueueBar currentServing={currentServing} pending={pending} />
                </header>

                {/* ── MAIN CONTENT ── */}
                <main style={{ flex: 1 }}>

                    {/* ─ HERO SECTION ─ */}
                    <section style={{ position: 'relative', overflow: 'hidden', minHeight: 520 }}>
                        {/* Background image */}
                        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(/hero.png)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'brightness(0.35)' }} />
                        {/* Gradient overlays */}
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 30%, var(--bg) 100%)' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(249,115,22,0.08) 0%, transparent 60%)' }} />

                        {/* Floating orbs */}
                        <div style={{ position: 'absolute', top: '20%', right: '10%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: '30%', left: '5%', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

                        <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto', padding: '80px 20px 60px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 24 }}>
                            <div className="fade-up">
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 99, padding: '6px 14px', marginBottom: 16 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Ouvert maintenant</span>
                                </div>
                                <h1 style={{ fontSize: 'clamp(32px, 6vw, 60px)', fontWeight: 900, lineHeight: 1.1, maxWidth: 600 }}>
                                    Bienvenue au<br />
                                    <span style={{ background: 'linear-gradient(90deg, #f97316, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                        Centre de Lavage
                                    </span>
                                </h1>
                                <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', marginTop: 16, maxWidth: 480, lineHeight: 1.6, fontWeight: 400 }}>
                                    Prenez votre ticket en quelques secondes et suivez votre position dans la file en temps réel.
                                </p>
                            </div>

                            {step === 'home' && (
                                <div className="fade-up" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                    <button className="btn-primary pulse-glow" onClick={() => setStep('form')} style={{ fontSize: 16, padding: '16px 32px' }}>
                                        <TicketIcon size={18} />
                                        Prendre un ticket
                                    </button>
                                    <button className="btn-ghost" onClick={() => document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' })}>
                                        Voir nos services
                                        <ChevronDown size={16} style={{ marginLeft: 4 }} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ─ FORM / TICKET SECTION ─ */}
                    {step !== 'home' && (
                        <section style={{ maxWidth: 520, margin: '0 auto', padding: '40px 20px' }}>
                            {step === 'form' && (
                                <div className="slide-in glass-strong" style={{ borderRadius: 24, padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    <div>
                                        <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>Vos informations</h2>
                                        <p style={{ fontSize: 13, color: 'var(--text3)' }}>Remplissez les champs requis pour générer votre ticket.</p>
                                    </div>

                                    <Field label="Prénom *" icon={<User size={12} />}>
                                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Mohamed" autoFocus />
                                    </Field>
                                    <Field label="Téléphone (optionnel)" icon={<Phone size={12} />}>
                                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="05xxxxxxxx" />
                                    </Field>

                                    <div style={{ height: 1, background: 'var(--border)' }} />

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Car size={14} color="var(--accent)" />
                                        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Votre véhicule</span>
                                    </div>

                                    <Field label="Marque *" icon={<Sparkles size={12} />}>
                                        <input type="text" value={brand} onChange={e => setBrand(e.target.value)} placeholder="Ex: Renault, Peugeot, Hyundai" />
                                    </Field>
                                    <Field label="Matricule *" icon={<Hash size={12} />}>
                                        <input type="text" value={plate} onChange={e => setPlate(e.target.value)} placeholder="Ex: 12345 120 16" />
                                    </Field>

                                    {/* Wait estimate */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 12 }}>
                                        <Clock size={16} color="#f97316" style={{ flexShrink: 0 }} />
                                        <div>
                                            <p style={{ fontSize: 11, color: '#f97316', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Attente estimée</p>
                                            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 600, marginTop: 2 }}>
                                                {pending.length === 0 ? '🎉 Vous passez en premier !' : `~${pending.length * 15} min (${pending.length} véhicule${pending.length > 1 ? 's' : ''} devant vous)`}
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button className="btn-ghost" onClick={reset} style={{ flex: 1 }}>Retour</button>
                                        <button className="btn-primary" onClick={handleGetTicket} disabled={!name.trim() || !plate.trim() || !brand.trim() || isSubmitting} style={{ flex: 2 }}>
                                            {isSubmitting ? <><RefreshCw size={16} className="spin" /> Traitement...</> : <><TicketIcon size={16} /> Confirmer</>}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {step === 'ticket' && myTicket && (
                                <div className="slide-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    {/* Success card */}
                                    <div style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(245,158,11,0.05))', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 24, padding: '48px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                                        {/* Glow ring */}
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

                                        {/* Check icon */}
                                        <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }} className="float">
                                            <CheckCircle size={32} color="#4ade80" />
                                        </div>

                                        <p className="label" style={{ marginBottom: 12 }}>Ticket confirmé ✓</p>

                                        {/* Ticket number — BIG */}
                                        <p style={{ fontSize: 'clamp(72px, 20vw, 110px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>
                                            #{myTicket.number}
                                        </p>

                                        {/* Date/time */}
                                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginTop: 10, letterSpacing: '0.03em' }}>
                                            {now.toLocaleDateString('fr-DZ', { day: '2-digit', month: '2-digit', year: 'numeric' })} à {now.toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })}
                                        </p>

                                        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginTop: 20 }}>
                                            {myTicket.position === 1 ? '🎉 Vous êtes le prochain !' : `${myTicket.position - 1} véhicule${myTicket.position > 2 ? 's' : ''} avant vous`}
                                        </p>

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
                                            <Hash size={11} />
                                            <span>Surveillez l'écran d'affichage pour votre numéro</span>
                                        </div>
                                    </div>

                                    {/* Current queue peek */}
                                    {activeTickets.length > 0 && (
                                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 16 }}>
                                            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>File d'attente</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {activeTickets.slice(0, 5).map(t => (
                                                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: t.ticket_number === myTicket.number ? 'rgba(249,115,22,0.12)' : 'transparent', border: t.ticket_number === myTicket.number ? '1px solid rgba(249,115,22,0.25)' : '1px solid transparent' }}>
                                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.status === 'in_progress' ? '#4ade80' : 'rgba(255,255,255,0.2)', boxShadow: t.status === 'in_progress' ? '0 0 6px #4ade80' : 'none', flexShrink: 0 }} />
                                                        <span style={{ fontWeight: 800, fontSize: 14, color: t.status === 'in_progress' ? '#4ade80' : t.ticket_number === myTicket.number ? '#f97316' : 'rgba(255,255,255,0.6)' }}>
                                                            #{t.ticket_number}
                                                        </span>
                                                        <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>
                                                            {t.status === 'in_progress' ? 'En service' : 'En attente'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <button className="btn-ghost" style={{ width: '100%' }} onClick={reset}>
                                        Nouveau ticket
                                    </button>
                                </div>
                            )}
                        </section>
                    )}

                    {/* ─ STATS BAR ─ */}
                    <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', margin: '40px 0', background: 'var(--surface)' }}>
                        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 24, textAlign: 'center' }}>
                            {[
                                { num: '500+', label: 'Véhicules / mois' },
                                { num: '15 min', label: 'Lavage express' },
                                { num: '4.9 ★', label: 'Note clients' },
                                { num: '7 jours', label: 'Horaires d\'ouverture' },
                            ].map(({ num, label }) => (
                                <div key={label}>
                                    <p style={{ fontSize: 28, fontWeight: 900, background: 'linear-gradient(90deg, #f97316, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{num}</p>
                                    <p style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, marginTop: 4 }}>{label}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ─ SERVICES SECTION ─ */}
                    <section id="services-section" style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 20px' }}>
                        <div style={{ marginBottom: 40 }}>
                            <p className="label" style={{ marginBottom: 10 }}>Ce que nous faisons</p>
                            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 900, lineHeight: 1.2 }}>
                                Nos Services <span style={{ background: 'linear-gradient(90deg, #f97316, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Professionnels</span>
                            </h2>
                            <p style={{ fontSize: 15, color: 'var(--text2)', marginTop: 12, maxWidth: 500, lineHeight: 1.7 }}>
                                Des prestations de qualité pour prendre soin de votre véhicule avec des produits certifiés.
                            </p>
                        </div>

                        {services.length === 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} style={{ borderRadius: 20, height: 140, border: '1px solid var(--border)', background: 'linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.06), rgba(255,255,255,0.04))', backgroundSize: '200% auto', animation: 'shimmer 1.5s infinite' }} />
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                            {services.map((s, i) => {
                                const Icon = SERVICE_ICONS[i % SERVICE_ICONS.length];
                                const color = SERVICE_ICON_COLORS[i % SERVICE_ICON_COLORS.length];
                                const gradient = SERVICE_COLORS[i % SERVICE_COLORS.length];
                                return (
                                    <article key={s.id} className="service-card">
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                                            <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg, ${color}22, ${color}11)`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Icon size={24} color={color} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontWeight: 800, fontSize: 15, color: '#fff', marginBottom: 4, lineHeight: 1.3 }}>{s.name}</p>
                                                {s.description && <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, marginBottom: 10 }}>{s.description}</p>}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                                                    <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--accent)' }}>{s.price.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)' }}>DZD</span></span>
                                                    {s.duration_minutes > 0 && (
                                                        <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: 8, color: 'var(--text3)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <Clock size={10} /> ~{s.duration_minutes} min
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    {/* ─ CTA SECTION ─ */}
                    {step === 'home' && (
                        <section style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(245,158,11,0.04))', borderTop: '1px solid rgba(249,115,22,0.12)', borderBottom: '1px solid rgba(249,115,22,0.12)' }}>
                            <div style={{ maxWidth: 600, margin: '0 auto', padding: '64px 20px', textAlign: 'center' }}>
                                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 40px rgba(249,115,22,0.4)' }} className="float">
                                    <TicketIcon size={32} color="white" />
                                </div>
                                <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, marginBottom: 12 }}>Prêt à passer ?</h2>
                                <p style={{ fontSize: 15, color: 'var(--text2)', marginBottom: 32, lineHeight: 1.6 }}>
                                    Prenez votre ticket maintenant et évitez l'attente au comptoir.
                                </p>
                                <button className="btn-primary pulse-glow" onClick={() => { setStep('form'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ fontSize: 16, padding: '16px 40px', margin: '0 auto' }}>
                                    <TicketIcon size={18} />
                                    Prendre un ticket maintenant
                                </button>
                            </div>
                        </section>
                    )}

                    {/* ─ TRUST BADGES ─ */}
                    <section style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                            {[
                                { icon: ShieldCheck, color: '#4ade80', label: 'Qualité Garantie', desc: 'Produits professionnels certifiés' },
                                { icon: Zap, color: '#f59e0b', label: 'Service Rapide', desc: 'Prise en charge immédiate' },
                                { icon: Award, color: '#a78bfa', label: 'Expertise', desc: 'Des années de savoir-faire' },
                                { icon: Star, color: '#fb7185', label: '4.9/5 ★', desc: 'Satisfaction garantie' },
                            ].map(({ icon: Icon, color, label, desc }) => (
                                <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s' }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}15`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Icon size={20} color={color} />
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 800, fontSize: 13, color: '#fff' }}>{label}</p>
                                        <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </main>

                {/* ── FOOTER ── */}
                <footer style={{ borderTop: '1px solid var(--border)', padding: '24px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #f97316, #ea580c)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Car size={16} color="white" />
                        </div>
                        <span style={{ fontWeight: 800, fontSize: 14 }}>Lavage & Vidange Pro</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text3)' }}>© 2026 — Tous droits réservés</p>
                </footer>

                {/* ── FLOATING TICKET BUTTON (mobile) ── */}
                {step === 'home' && (
                    <div style={{ position: 'fixed', bottom: 24, right: 20, zIndex: 200 }}>
                        <button className="btn-primary pulse-glow" onClick={() => { setStep('form'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ borderRadius: 99, padding: '14px 22px', gap: 8, boxShadow: '0 8px 32px rgba(249,115,22,0.5)' }}>
                            <TicketIcon size={18} />
                            <span>Mon ticket</span>
                        </button>
                    </div>
                )}
                {/* ── TURN ALERT OVERLAY ── */}
                {turnAlert && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(5,5,8,0.95)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} className="fade-in">
                        <div className="alert-pulse glass-strong" style={{ maxWidth: 440, width: '100%', padding: '48px 32px', borderRadius: 32, textAlign: 'center', border: '1px solid var(--accent)', boxShadow: '0 0 50px rgba(249,115,22,0.2)' }}>
                            <div className="ring-shake" style={{ width: 88, height: 88, borderRadius: '50%', background: 'rgba(249,115,22,0.15)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <Bell size={44} color="var(--accent)" />
                            </div>
                            <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 16 }}>C'est presque à vous !</h2>
                            <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 16, color: 'var(--accent)' }}>لقد حان دورك</h2>
                            <p style={{ fontSize: 16, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 32 }}>
                                {pending.map(t => t.ticket_number).indexOf(myTicket?.number || '') === 0
                                    ? "C'est votre tour maintenant. Veuillez vous avancer !"
                                    : "Il ne reste qu'un seul véhicule devant vous. Préparez-vous !"}
                            </p>
                            <button className="btn-primary" onClick={() => setTurnAlert(false)} style={{ width: '100%', padding: '18px', fontSize: 16 }}>
                                D'accord / حسناً
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
