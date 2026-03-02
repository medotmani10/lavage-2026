import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import {
    Droplets, Wrench, ChevronRight, CheckCircle2, Ticket,
    Sparkles, Clock, MapPin, Phone
} from 'lucide-react';

export default function LandingPage() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [service, setService] = useState<'lavage' | 'vidange' | 'pneumatique'>('lavage');
    const [servicesByCategory, setServicesByCategory] = useState<Record<string, any[]>>({});
    const [activeTab, setActiveTab] = useState<string>('lavage');
    const [queueTickets, setQueueTickets] = useState<any[]>([]);

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchServices = async () => {
            const { data } = await supabase.from('services').select('*').eq('active', true);
            if (data && data.length > 0) {
                const grouped = data.reduce((acc: any, s: any) => {
                    const cat = s.category || 'lavage';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(s);
                    return acc;
                }, {});
                setServicesByCategory(grouped);
            }
        };
        fetchServices();

        const fetchQueue = async () => {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const { data } = await supabase
                .from('queue_tickets')
                .select('ticket_number, status, requested_service, created_at')
                .gte('created_at', startOfDay.toISOString())
                .in('status', ['pending', 'in_progress'])
                .order('created_at', { ascending: true });

            if (data) setQueueTickets(data);
        };
        fetchQueue();

        const channel = supabase
            .channel('public:queue_tickets')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_tickets' }, () => {
                fetchQueue();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);
    const [error, setError] = useState('');
    const [ticketNumber, setTicketNumber] = useState<string | null>(null);

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || phone.length < 9) {
            setError('Veuillez remplir correctement votre nom et votre numéro de téléphone.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const { data, error: rpcError } = await supabase.rpc('rpc_create_guest_ticket', {
                p_name: name,
                p_phone: phone,
                p_service: service,
                p_vehicle_type: 'voiture'
            });

            if (rpcError) throw rpcError;
            setTicketNumber(data as string);

        } catch (err: any) {
            console.error(err);
            setError("Impossible d'enregistrer la réservation. Veuillez réessayer à la caisse.");
        } finally {
            setIsLoading(false);
        }
    };

    const scrollToBooking = () => {
        document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    if (ticketNumber) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[var(--bg-base)] to-[#0f172a]">
                <div className="w-full max-w-sm bg-[var(--bg-panel)]/80 backdrop-blur-2xl border border-[var(--border-medium)] rounded-[32px] p-8 text-center shadow-2xl relative overflow-hidden animate-fade-up">
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-success-400 to-primary-500"></div>

                    <div className="w-24 h-24 bg-success-500/10 border-2 border-success-500/30 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                        <div className="absolute inset-0 bg-success-500/20 rounded-full animate-ping opacity-20"></div>
                        <CheckCircle2 className="w-12 h-12 text-success-400" />
                    </div>

                    <h2 className="text-3xl font-black text-white mb-2 tracking-tight">C'est Noté !</h2>
                    <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">Présentez ce numéro à la caisse ou au technicien lors de votre arrivée à la station.</p>

                    <div className="bg-[var(--bg-base)] border border-dashed border-primary-500/30 rounded-3xl p-6 mb-8 relative group hover:border-primary-500/60 transition-colors">
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[var(--bg-panel)] rounded-full border-r border-[var(--border-medium)]"></div>
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[var(--bg-panel)] rounded-full border-l border-[var(--border-medium)]"></div>

                        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3">Votre Ticket</p>
                        <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-primary-300 tracking-tighter drop-shadow-lg">
                            {ticketNumber}
                        </p>
                    </div>

                    <Button size="lg" onClick={() => setTicketNumber(null)} className="w-full font-bold">
                        Nouvelle Réservation
                    </Button>

                    <div className="mt-8">
                        <button
                            onClick={() => navigate('/login')}
                            className="text-sm font-semibold text-primary-400 hover:text-primary-300 transition-colors underline-offset-4 hover:underline"
                        >
                            Accéder à mon Espace Client
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-base)] text-white w-full overflow-x-hidden selection:bg-primary-500/30">

            {/* --- HERO SECTION --- */}
            <section className="relative w-full min-h-[100svh] flex flex-col items-center justify-center px-4 py-8 lg:p-12">
                {/* Background Image & Overlay */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/car_detailing_hero_1772411943853.png"
                        alt="Lavage Vida Detailing"
                        className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-[var(--bg-base)]"></div>
                </div>

                {/* Global Nav */}
                <header className="absolute top-0 left-0 right-0 w-full max-w-7xl mx-auto flex justify-between items-center p-6 z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10">
                            <Droplets className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-black tracking-tighter text-white">
                            LAVAGE<span className="text-primary-500">VIDA</span>
                        </span>
                    </div>
                    <button
                        onClick={() => navigate('/login')}
                        className="text-sm font-bold text-white bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-full transition-all hover:scale-105"
                    >
                        Espace Client
                    </button>
                </header>

                {/* Hero Content */}
                <div className="relative z-10 w-full max-w-4xl mx-auto text-center mt-20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 animate-fade-up">
                        <Sparkles className="w-4 h-4 text-primary-400" />
                        <span className="text-sm font-semibold text-white/90">Centre Premium Auto & Detailing</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.1] tracking-tight mb-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
                        L'Excellence pour <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-blue-400 to-indigo-400">Votre Véhicule.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-[var(--text-secondary)] text-balance max-w-2xl mx-auto mb-10 animate-fade-up font-medium" style={{ animationDelay: '0.2s' }}>
                        Réservez un lavage ou une vidange instantanément. Pas d'attente, un service premium et gagnez des récompenses à chaque passage.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: '0.3s' }}>
                        <Button size="lg" onClick={scrollToBooking} className="w-full sm:w-auto px-8 h-14 text-lg !bg-white !text-black hover:!bg-gray-100 shadow-[0_0_40px_rgba(255,255,255,0.3)] border-transparent">
                            Réserver Maintenant
                        </Button>
                        <Button variant="outline" size="lg" onClick={() => navigate('/login')} className="w-full sm:w-auto px-8 h-14 text-lg border-white/20 text-white hover:bg-white/10 backdrop-blur-md">
                            Mon Espace Client
                        </Button>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-pulse-slow">
                    <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/50">Découvrir</span>
                    <div className="w-px h-12 bg-gradient-to-b from-white/50 to-transparent"></div>
                </div>
            </section>

            {/* --- SERVICES (PORTFOLIO DYNAMIQUE) --- */}
            <section className="w-full max-w-7xl mx-auto px-6 py-24">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Notre <span className="text-primary-400">Portfolio</span></h2>
                    <p className="text-[var(--text-secondary)] font-medium max-w-xl mx-auto mb-10">Des services complets conçus pour protéger et sublimer votre véhicule.</p>

                    <div className="flex bg-[var(--bg-base)] p-1.5 rounded-2xl border border-[var(--border-light)] overflow-x-auto hide-scrollbar max-w-md mx-auto mb-12">
                        {['lavage', 'vidange', 'pneumatique'].map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveTab(cat)}
                                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all capitalize whitespace-nowrap ${activeTab === cat ? 'bg-white text-black shadow-lg' : 'text-[var(--text-muted)] hover:text-white'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {Object.keys(servicesByCategory).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {(servicesByCategory[activeTab] || []).map((s) => (
                            <div key={s.id} className="bg-[var(--bg-panel)] border border-[var(--border-medium)] rounded-[32px] p-8 hover:border-primary-500/50 transition-colors group relative overflow-hidden flex flex-col">
                                <h3 className="text-xl font-bold text-white mb-2">{s.name}</h3>
                                {s.description && (
                                    <p className="text-[var(--text-secondary)] leading-relaxed text-sm mb-6 flex-1">{s.description}</p>
                                )}
                                <div className="mt-auto flex items-end justify-between pt-6 border-t border-[var(--border-light)]">
                                    <div>
                                        <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider mb-1">Prix</p>
                                        <p className="text-2xl font-black text-primary-400">{s.price} DA</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-[var(--text-muted)]">
                        Chargement des services disponibles...
                    </div>
                )}
            </section>

            {/* --- LIVE QUEUE (FILE D'ATTENTE) --- */}
            <section className="w-full max-w-5xl mx-auto px-6 py-12 md:py-24">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Station en Temps Réel</h2>
                    <p className="text-[var(--text-secondary)] font-medium max-w-xl mx-auto">Suivez l'état actuel de la station avant même de générer votre ticket.</p>
                </div>

                <div className="bg-[var(--bg-panel)]/80 backdrop-blur-xl border border-[var(--border-medium)] rounded-[32px] p-8 shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-primary-500 to-yellow-500"></div>

                    {queueTickets.length === 0 ? (
                        <div className="text-center py-12 animate-fade-up">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success-500/10 text-success-400 mb-6 border border-success-500/20">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Station Fluide</h3>
                            <p className="text-[var(--text-secondary)] max-w-sm mx-auto">Il n'y a pas d'attente actuellement. C'est le moment idéal pour venir !</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[500px]">
                                <thead>
                                    <tr className="border-b border-[var(--border-heavy)] text-[var(--text-muted)] text-sm uppercase tracking-wider">
                                        <th className="pb-4 font-bold pl-4">Ticket</th>
                                        <th className="pb-4 font-bold">Heure</th>
                                        <th className="pb-4 font-bold">Catégorie</th>
                                        <th className="pb-4 font-bold text-right pr-4">Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {queueTickets.map((t, idx) => {
                                        const timeStr = new Date(t.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                                        return (
                                            <tr key={idx} className="border-b border-[var(--border-light)] hover:bg-white/5 transition-colors group">
                                                <td className="py-5 pl-4 font-black text-white">{t.ticket_number}</td>
                                                <td className="py-5 text-[var(--text-secondary)] font-medium">{timeStr}</td>
                                                <td className="py-5 text-[var(--text-secondary)] capitalize font-medium">{t.requested_service}</td>
                                                <td className="py-5 pr-4 text-right">
                                                    {t.status === 'in_progress' ? (
                                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 text-yellow-500 text-xs font-bold rounded-full border border-yellow-500/20">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                                                            En cours
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-base)] text-[var(--text-secondary)] border border-[var(--border-medium)] text-xs font-bold rounded-full group-hover:border-[var(--border-heavy)] transition-colors">
                                                            <Clock className="w-3 h-3" />
                                                            En attente
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            {/* --- HOW IT WORKS --- */}
            <section className="w-full bg-[#0d1117] border-y border-[var(--border-light)] py-24">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-black text-white mb-4">Comment ça marche ?</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                        {/* Connector Line (Desktop) */}
                        <div className="hidden md:block absolute top-[40px] left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-transparent via-[var(--border-heavy)] to-transparent"></div>

                        <div className="relative flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-primary-600 rounded-3xl flex items-center justify-center text-2xl font-black text-white shadow-[0_0_30px_rgba(99,102,241,0.4)] mb-6 z-10 rotate-3 cursor-default hover:rotate-0 transition-all">
                                1
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Je réserve</h3>
                            <p className="text-[var(--text-secondary)] text-balance">Saisissez votre nom et téléphone dans le formulaire ci-dessous. Sans compte requis.</p>
                        </div>

                        <div className="relative flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-[var(--bg-panel)] border border-[var(--border-medium)] rounded-3xl flex items-center justify-center text-2xl font-black text-white mb-6 z-10 -rotate-3 hover:rotate-0 transition-all">
                                2
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Je me présente</h3>
                            <p className="text-[var(--text-secondary)] text-balance">Donnez votre numéro de Ticket au technicien. Votre tour est déjà sécurisé.</p>
                        </div>

                        <div className="relative flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-[var(--bg-panel)] border border-[var(--border-medium)] rounded-3xl flex items-center justify-center text-2xl font-black text-white mb-6 z-10 rotate-3 hover:rotate-0 transition-all">
                                3
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">J'accède à mon Espace</h3>
                            <p className="text-[var(--text-secondary)] text-balance">Demandez votre code PIN à la caisse pour suivre votre historique et vos lavages gratuits.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- BOOKING SECTION --- */}
            <section id="booking-section" className="w-full max-w-5xl mx-auto px-6 py-24 relative">
                {/* Glow behind form */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-primary-600/10 blur-[120px] rounded-full pointer-events-none"></div>

                <div className="bg-[var(--bg-panel)]/60 backdrop-blur-3xl border border-[var(--border-medium)] rounded-[40px] p-8 md:p-12 shadow-2xl relative z-10 flex flex-col md:flex-row gap-12 items-center">

                    <div className="flex-1 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-500/10 text-primary-400 font-bold text-sm mb-6">
                            <Clock className="w-4 h-4" /> Rapide & Simple
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Générez votre<br />Ticket <span className="text-primary-400">Maintenant</span></h2>
                        <p className="text-[var(--text-secondary)] text-lg mb-8">Ne perdez plus de temps dans la file d'attente physique. Bloquez votre place virtuellement.</p>

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4 text-sm text-[var(--text-muted)] font-medium">
                                <CheckCircle2 className="w-5 h-5 text-success-500" /> Sans création de compte préalable
                            </div>
                            <div className="flex items-center gap-4 text-sm text-[var(--text-muted)] font-medium">
                                <CheckCircle2 className="w-5 h-5 text-success-500" /> Numéro de ticket instantané
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="w-full md:w-[400px] shrink-0 bg-[#141414] border border-[var(--border-heavy)] rounded-[32px] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Ticket className="w-5 h-5 text-primary-400" />
                            Nouveau Passage
                        </h3>

                        <form onSubmit={handleBooking} className="space-y-5">

                            <div className="flex bg-[var(--bg-base)] p-1.5 rounded-2xl border border-[var(--border-light)] overflow-x-auto hide-scrollbar">
                                <button
                                    type="button"
                                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-3 min-w-[90px] rounded-xl text-sm font-bold transition-all ${service === 'lavage' ? 'bg-primary-500 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-white'}`}
                                    onClick={() => setService('lavage')}
                                >
                                    <Droplets className="w-4 h-4 shrink-0" /> Lavage
                                </button>
                                <button
                                    type="button"
                                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-3 min-w-[90px] rounded-xl text-sm font-bold transition-all ${service === 'vidange' ? 'bg-blue-600 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-white'}`}
                                    onClick={() => setService('vidange')}
                                >
                                    <Wrench className="w-4 h-4 shrink-0" /> Vidange
                                </button>
                                <button
                                    type="button"
                                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-3 min-w-[90px] rounded-xl text-sm font-bold transition-all ${service === 'pneumatique' ? 'bg-yellow-600 text-white shadow-md' : 'text-[var(--text-muted)] hover:text-white'}`}
                                    onClick={() => setService('pneumatique')}
                                >
                                    <div className="w-4 h-4 rounded-full border-2 border-current border-dashed shrink-0" /> Pneus
                                </button>
                            </div>

                            <Input
                                label="Nom & Prénom"
                                placeholder="Ex: Ahmed Yacine"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />

                            <Input
                                label="Numéro de Téléphone"
                                placeholder="Ex: 0550 12 34 56"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                            />

                            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-medium">{error}</div>}

                            <Button type="submit" size="lg" className="w-full mt-4 h-14" isLoading={isLoading}>
                                Obtenir mon ticket <ChevronRight className="w-5 h-5 ml-1" />
                            </Button>
                        </form>
                    </div>

                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer className="w-full bg-[#0a0a0a] border-t border-[var(--border-light)] pt-16 pb-8 px-6 text-center md:text-left">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-12 mb-12">

                    <div className="max-w-sm">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                            <Droplets className="w-6 h-6 text-primary-500" />
                            <span className="text-xl font-black text-white tracking-tighter">LAVAGE<span className="text-primary-500">VIDA</span></span>
                        </div>
                        <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-6">
                            Le premier centre automobile intelligent d'Algérie. Nous prenons soin de votre véhicule avec des technologies de pointe et un programme de fidélité transparent.
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-12">
                        <div>
                            <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Contact</h4>
                            <ul className="space-y-3 text-sm text-[var(--text-muted)]">
                                <li className="flex items-center justify-center md:justify-start gap-2"><MapPin className="w-4 h-4" /> Alger, Centre</li>
                                <li className="flex items-center justify-center md:justify-start gap-2"><Phone className="w-4 h-4" /> 0550 00 00 00</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Liens Utiles</h4>
                            <ul className="space-y-3 text-sm text-[var(--text-muted)]">
                                <li><button onClick={scrollToBooking} className="hover:text-primary-400 transition-colors">Réserver</button></li>
                                <li><button onClick={() => navigate('/login')} className="hover:text-primary-400 transition-colors">Espace Client</button></li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto border-t border-[var(--border-light)] pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-[var(--text-muted)]">
                    <p>© {new Date().getFullYear()} Lavage Vida. Tous droits réservés.</p>
                    <div className="flex gap-4 mt-4 md:mt-0">
                        <span className="hover:text-white cursor-pointer transition-colors">Confidentialité</span>
                        <span className="hover:text-white cursor-pointer transition-colors">Conditions</span>
                    </div>
                </div>
            </footer>

        </div>
    );
}
