import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import {
    Building2,
    Globe,
    CreditCard,
    Printer,
    Bell,
    Save,
    Moon,
    Users,
    KeyRound,
    Plus,
    Edit2,
    Trash2,
    X,
    Database,
    AlertTriangle,
    RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import { showAlert, showConfirm, showPrompt } from '../stores/useDialogStore';
import type { User } from '../lib/db';
import type { UserRole } from '../lib/database.types';
import { queueOperation } from '../lib/sync';
import { useSupabaseData } from '../hooks/useSupabaseData';

export function Settings() {
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState('general');
    const [isSaving, setIsSaving] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => setIsSaving(false), 1000); // Simulate save
    };

    const tabs = [
        { id: 'general', icon: Building2, label: 'Général' },
        { id: 'users', icon: Users, label: 'Utilisateurs & PIN' },
        { id: 'localization', icon: Globe, label: 'Localisation' },
        { id: 'billing', icon: CreditCard, label: 'Facturation' },
        { id: 'printer', icon: Printer, label: 'Impression' },
        { id: 'notifications', icon: Bell, label: 'Notifications' },
        { id: 'advanced', icon: Database, label: 'Avancé' },
    ];

    const { data: rawUsers } = useSupabaseData<any>('users');
    const usersData = rawUsers.filter(u => u.active !== false);

    const handleDeleteUser = async (user: User) => {
        if (!(await showConfirm(t('messages.deleteConfirm', 'Êtes-vous sûr de vouloir supprimer cet utilisateur ?')))) return;
        await queueOperation('users', 'UPDATE', { ...user, active: false, updated_at: new Date().toISOString() });
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">{t('navigation.settings')}</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Configuration du système Lavage Vida</p>
                </div>

                <Button variant="primary" onClick={handleSave} isLoading={isSaving} className="shadow-[var(--shadow-glow-orange)]">
                    <Save className="w-4 h-4 mr-2" />
                    {t('common.save')}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Sidebar */}
                <Card className="p-2 border-[var(--border-lg)] bg-[var(--bg-panel)] h-fit">
                    <nav className="space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id
                                    ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-white border border-transparent'
                                    }`}
                            >
                                <tab.icon className="w-5 h-5 shrink-0" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </Card>

                {/* Content */}
                <div className="md:col-span-3">
                    <Card className="p-6 border-[var(--border-lg)] bg-[var(--bg-panel)] shadow-xl">
                        {activeTab === 'general' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
                                    <div className="w-10 h-10 bg-[var(--bg-base)] border border-[var(--border-lg)] rounded-xl flex items-center justify-center">
                                        <Building2 className="w-5 h-5 text-primary-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Informations de l'Établissement</h2>
                                        <p className="text-xs text-[var(--text-muted)] font-medium">Ces informations apparaîtront sur les reçus de vos clients.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <Input label="Nom de l'établissement" defaultValue="Lavage Vida" />
                                    <Input label="Numéro de Téléphone" defaultValue="0555 12 34 56" />
                                    <div className="sm:col-span-2">
                                        <Input label="Adresse Complète" defaultValue="Alger, Algérie" />
                                    </div>
                                    <Input label="Numéro de Registre de Commerce (RC)" defaultValue="16/00-0000000A00" />
                                    <Input label="NIF (Numéro d'Identification Fiscale)" defaultValue="000000000000000" />
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
                                    <div className="w-10 h-10 bg-[var(--bg-base)] border border-[var(--border-lg)] rounded-xl flex items-center justify-center">
                                        <Users className="w-5 h-5 text-primary-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Gestion des Utilisateurs & PIN</h2>
                                        <p className="text-xs text-[var(--text-muted)] font-medium">Gérez les accès, les rôles et définissez les codes PIN pour la connexion hors ligne.</p>
                                    </div>
                                    <Button onClick={() => { setEditingUser(null); setShowUserModal(true); }} className="ml-auto shrink-0 flex items-center gap-2">
                                        <Plus className="w-4 h-4" />
                                        Ajouter
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {!usersData ? (
                                        <p className="text-sm text-[var(--text-muted)]">Chargement...</p>
                                    ) : usersData.length === 0 ? (
                                        <p className="text-sm text-[var(--text-muted)]">Aucun utilisateur trouvé.</p>
                                    ) : (
                                        usersData.map((user: any) => (
                                            <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500 font-bold uppercase shrink-0">
                                                        {user.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-white">{user.full_name}</h3>
                                                        <p className="text-xs text-[var(--text-secondary)]">{user.role} • {user.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 w-full sm:w-auto mt-4 sm:mt-0">
                                                    <div className="w-full sm:w-48">
                                                        <Input
                                                            type="password"
                                                            placeholder="PIN (Optionnel)"
                                                            maxLength={6}
                                                            defaultValue={user.pin_code || ''}
                                                            icon={<KeyRound className="w-4 h-4 text-[var(--text-muted)]" />}
                                                            className="text-center tracking-widest font-mono text-sm"
                                                            onChange={async (e) => {
                                                                const newPin = e.target.value;
                                                                if (newPin.length >= 4 || newPin.length === 0) {
                                                                    await queueOperation('users', 'UPDATE', { ...user, pin_code: newPin || null, updated_at: new Date().toISOString() });
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            onClick={() => { setEditingUser(user); setShowUserModal(true); }}
                                                            className="p-2 text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors border border-transparent hover:border-primary-500/30"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(user)}
                                                            className="p-2 text-danger-400 hover:bg-danger-500/10 rounded-lg transition-colors border border-transparent hover:border-danger-500/30"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'localization' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
                                    <div className="w-10 h-10 bg-[var(--bg-base)] border border-[var(--border-lg)] rounded-xl flex items-center justify-center">
                                        <Globe className="w-5 h-5 text-primary-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Langue et Région</h2>
                                        <p className="text-xs text-[var(--text-muted)] font-medium">Préférences régionales et monétaires.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <Select
                                        label="Langue de l'interface"
                                        value={i18n.language}
                                        onChange={(e) => i18n.changeLanguage(e.target.value)}
                                        options={[
                                            { value: 'fr', label: 'Français' },
                                            { value: 'ar', label: 'العربية' }
                                        ]}
                                    />
                                    <Select
                                        label="Devise"
                                        value="DZD"
                                        options={[
                                            { value: 'DZD', label: 'Dinar Algérien (DZD)' }
                                        ]}
                                    />
                                    <Select
                                        label="Fuseau Horaire"
                                        value="Africa/Algiers"
                                        options={[
                                            { value: 'Africa/Algiers', label: 'Heure d\'Alger (GMT+1)' }
                                        ]}
                                    />
                                </div>

                                <div className="mt-8 p-4 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Moon className="w-5 h-5 text-primary-500" />
                                            <div>
                                                <p className="text-sm font-bold text-white">Thème de l'interface</p>
                                                <p className="text-xs text-[var(--text-secondary)]">Le mode sombre (Dark Automotive) est activé par défaut pour réduire la fatigue oculaire et améliorer le confort.</p>
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-primary-400 bg-primary-500/10 px-2 py-1 rounded border border-primary-500/20">
                                            Actif
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'billing' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
                                    <div className="w-10 h-10 bg-[var(--bg-base)] border border-[var(--border-lg)] rounded-xl flex items-center justify-center">
                                        <CreditCard className="w-5 h-5 text-primary-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Facturation et Taxes</h2>
                                        <p className="text-xs text-[var(--text-muted)] font-medium">Taux de TVA et paramètres par défaut.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <Input label="Taux de TVA par défaut (%)" type="number" defaultValue="19" />
                                    <Select
                                        label="Méthode de paiement par défaut"
                                        options={[
                                            { value: 'cash', label: 'Espèces' },
                                            { value: 'card', label: 'Carte Bancaire' },
                                            { value: 'credit', label: 'Crédit (Dette)' }
                                        ]}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'printer' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
                                    <div className="w-10 h-10 bg-[var(--bg-base)] border border-[var(--border-lg)] rounded-xl flex items-center justify-center">
                                        <Printer className="w-5 h-5 text-primary-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Matériel et Impression</h2>
                                        <p className="text-xs text-[var(--text-muted)] font-medium">Configuration des imprimantes thermiques.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <Select
                                        label="Modèle d'imprimante thermique"
                                        options={[
                                            { value: '80mm', label: 'Imprimante 80mm' },
                                            { value: '58mm', label: 'Imprimante 58mm' }
                                        ]}
                                    />

                                    <div className="flex items-center justify-between p-4 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl">
                                        <div>
                                            <h3 className="text-sm font-bold text-white">Impression automatique</h3>
                                            <p className="text-xs text-[var(--text-secondary)] mt-1">Imprimer automatiquement le reçu après un encaissement réussi.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" defaultChecked />
                                            <div className="w-11 h-6 bg-[var(--bg-panel)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl">
                                        <div>
                                            <h3 className="text-sm font-bold text-white">Ouverture du tiroir-caisse</h3>
                                            <p className="text-xs text-[var(--text-secondary)] mt-1">Envoyer le signal d'ouverture au tiroir-caisse connecté lors d'un paiement en espèces.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" defaultChecked />
                                            <div className="w-11 h-6 bg-[var(--bg-panel)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="space-y-6 animate-fade-in relative">
                                <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
                                    <div className="w-10 h-10 bg-[var(--bg-base)] border border-[var(--border-lg)] rounded-xl flex items-center justify-center">
                                        <Bell className="w-5 h-5 text-primary-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Notifications du Système</h2>
                                        <p className="text-xs text-[var(--text-muted)] font-medium">Gérez les alertes et les notifications</p>
                                    </div>
                                </div>

                                <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6 text-center">
                                    <Bell className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
                                    <p className="text-white font-bold mb-1">Module de Notifications</p>
                                    <p className="text-sm text-[var(--text-secondary)]">Les paramètres de notifications avancées seront disponibles prochainement.</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'advanced' && (
                            <div className="space-y-6 animate-fade-in relative">
                                <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)]">
                                    <div className="w-10 h-10 bg-danger-500/10 border border-danger-500/20 rounded-xl flex items-center justify-center">
                                        <AlertTriangle className="w-5 h-5 text-danger-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Zone de Danger</h2>
                                        <p className="text-xs text-[var(--text-muted)] font-medium">Actions irréversibles et maintenance du système.</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 bg-[var(--bg-base)] border border-danger-500/20 rounded-xl">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                    <RefreshCw className="w-4 h-4 text-warning-500" />
                                                    Réinitialiser le Cache Local
                                                </h3>
                                                <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-lg">
                                                    Vide la base de données locale (hors ligne) et force une resynchronisation complète depuis le serveur web lors du prochain rechargement.
                                                </p>
                                            </div>
                                            <Button
                                                variant="secondary"
                                                className="shrink-0 border-warning-500/30 text-warning-400 hover:bg-warning-500/10"
                                                onClick={async () => {
                                                    if (!(await showConfirm("Voulez-vous vraiment vider le cache local ? L'application va redémarrer."))) return;
                                                    await db.delete();
                                                    window.location.reload();
                                                }}
                                            >
                                                Vider le cache
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-danger-500/5 border border-danger-500/30 rounded-xl">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <h3 className="text-sm font-bold text-danger-400 flex items-center gap-2">
                                                    <Database className="w-4 h-4" />
                                                    Réinitialisation Totale des Données
                                                </h3>
                                                <p className="text-gray-400 mb-6">
                                                    Supprime DÉFINITIVEMENT toutes les données (clients, tickets, paiements, services, produits, employés, fournisseurs, etc). Seul votre compte d'accès sera conservé. Cette action est IRRÉVERSIBLE.
                                                </p>
                                            </div>
                                            <Button
                                                className="shrink-0 bg-danger-500 hover:bg-danger-600 text-white border-transparent"
                                                onClick={async () => {
                                                    const code = await showPrompt(
                                                        "ATTENTION: C'est irréversible! Tapez 'RESET' pour confirmer la suppression de toutes les données d'activité.",
                                                        "Réinitialisation Totale",
                                                        "RESET",
                                                        "Supprimer tout"
                                                    );
                                                    if (code !== 'RESET') return;

                                                    setIsSaving(true);
                                                    try {
                                                        // Clear local sync queue first to stop background pushes
                                                        await db.sync_queue.clear();

                                                        // Order matters due to foreign keys. We drop child relations first.
                                                        const tables = [
                                                            'loyalty_transactions',
                                                            'stock_movements',
                                                            'attendance',
                                                            'purchase_invoices',
                                                            'ticket_services',
                                                            'ticket_products',
                                                            'payments',
                                                            'commissions',
                                                            'debts',
                                                            'financial_transactions',
                                                            'queue_tickets',
                                                            'vehicles',
                                                            'customers',
                                                            'products',
                                                            'services',
                                                            'employees',
                                                            'suppliers'
                                                        ] as const;

                                                        for (const table of tables) {
                                                            // Using .not('id', 'is', null) which is the official canonical PostgREST method to mass delete
                                                            const { error } = await supabase.from(table).delete().not('id', 'is', null);
                                                            if (error) {
                                                                console.error(`Error deleting ${table}:`, error);
                                                                throw new Error(`[${table}] ${error.message}`);
                                                            }
                                                        }

                                                        // Wipe local storage explicitly
                                                        await db.delete();
                                                        showAlert("Réinitialisation réussie. L'application va redémarrer.", "success");
                                                        window.location.reload();
                                                    } catch (err: any) {
                                                        console.error(err);
                                                        showAlert(`Erreur lors de la réinitialisation: ${err.message || 'Erreur inconnue'}`, "error");
                                                    } finally {
                                                        setIsSaving(false);
                                                    }
                                                }}
                                            >
                                                Supprimer tout
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* User Modal */}
            {showUserModal && (
                <UserModal
                    user={editingUser}
                    onClose={() => {
                        setShowUserModal(false);
                        setEditingUser(null);
                    }}
                />
            )}
        </div>
    );
}

interface UserModalProps {
    user: User | null;
    onClose: () => void;
}

function UserModal({ user, onClose }: UserModalProps) {
    const { t } = useTranslation();

    // All pages in the app
    const allPages = [
        { key: 'dashboard', label: 'Tableau de Bord' },
        { key: 'queue', label: 'File d\'Attente' },
        { key: 'pos', label: 'Caisse (POS)' },
        { key: 'customers', label: 'Clients' },
        { key: 'vehicles', label: 'Véhicules' },
        { key: 'services', label: 'Services' },
        { key: 'inventory', label: 'Inventaire' },
        { key: 'suppliers', label: 'Fournisseurs' },
        { key: 'employees', label: 'Employés' },
        { key: 'finance', label: 'Finance' },
        { key: 'reports', label: 'Rapports' },
        { key: 'settings', label: 'Paramètres' },
    ];

    const [formData, setFormData] = useState({
        full_name: user?.full_name || '',
        email: user?.email || '',
        role: user?.role || 'cashier',
        pin_code: user?.pin_code || '',
    });
    // null = all pages allowed (admin mode). array = specific restrictions.
    const [allowedPages, setAllowedPages] = useState<string[]>(
        user?.allowed_pages || allPages.map(p => p.key)
    );
    const [isLoading, setIsLoading] = useState(false);

    const togglePage = (key: string) => {
        setAllowedPages(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const isAdmin = formData.role === 'admin';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Admins always get full access (null = unrestricted)
            const pagesPayload = isAdmin ? null : allowedPages;

            if (user) {
                await queueOperation('users', 'UPDATE', {
                    ...user,
                    ...formData,
                    role: formData.role as UserRole,
                    allowed_pages: pagesPayload,
                    updated_at: new Date().toISOString()
                });
            } else {
                const newUserId = crypto.randomUUID();
                await queueOperation('users', 'INSERT', {
                    id: newUserId,
                    ...formData,
                    role: formData.role as UserRole,
                    allowed_pages: pagesPayload,
                    active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            }
            onClose();
        } catch (error) {
            console.error(error);
            showAlert(t('messages.saveError', 'Erreur lors de la sauvegarde.'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-lg)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-[var(--border)] shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary-500" />
                        {user ? 'Modifier Utilisateur' : 'Ajouter Utilisateur'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-white rounded-xl transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto">
                    <div className="p-6 space-y-4">
                        <Input
                            label="Nom Complet"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            required
                        />

                        <Input
                            label="Email (Identifiant)"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />

                        <Select
                            label="Rôle"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                            options={[
                                { value: 'admin', label: 'Administrateur' },
                                { value: 'manager', label: 'Gérant' },
                                { value: 'cashier', label: 'Caissier' },
                                { value: 'worker', label: 'Ouvrier' }
                            ]}
                            required
                        />

                        <Input
                            label="Code PIN (Optionnel)"
                            type="text"
                            maxLength={6}
                            value={formData.pin_code}
                            onChange={(e) => setFormData({ ...formData, pin_code: e.target.value })}
                            placeholder="Pour la connexion rapide hors ligne"
                            icon={<KeyRound className="w-4 h-4 text-[var(--text-muted)]" />}
                        />

                        {/* Page Access Permissions */}
                        <div className="pt-2">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-bold text-white uppercase tracking-wider">
                                    Accès aux Pages
                                </label>
                                {isAdmin ? (
                                    <span className="text-xs bg-primary-500/20 text-primary-400 font-bold px-2 py-1 rounded-lg border border-primary-500/30">
                                        Accès Total (Admin)
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            allowedPages.length === allPages.length
                                                ? setAllowedPages([])
                                                : setAllowedPages(allPages.map(p => p.key))
                                        }
                                        className="text-xs text-primary-400 hover:text-primary-300 font-semibold transition-colors"
                                    >
                                        {allowedPages.length === allPages.length ? 'Dé-sélectionner tout' : 'Sélectionner tout'}
                                    </button>
                                )}
                            </div>

                            <div className={`grid grid-cols-2 gap-2 p-3 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl ${isAdmin ? 'opacity-50 pointer-events-none' : ''
                                }`}>
                                {allPages.map(page => (
                                    <label
                                        key={page.key}
                                        className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all border ${allowedPages.includes(page.key)
                                            ? 'bg-primary-500/10 border-primary-500/30 text-primary-400'
                                            : 'bg-[var(--bg-panel)] border-transparent text-[var(--text-secondary)] hover:border-[var(--border-lg)]'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={allowedPages.includes(page.key)}
                                            onChange={() => togglePage(page.key)}
                                            className="sr-only"
                                        />
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${allowedPages.includes(page.key)
                                            ? 'bg-primary-500 border-primary-500'
                                            : 'border-[var(--border-lg)]'
                                            }`}>
                                            {allowedPages.includes(page.key) && (
                                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="text-xs font-semibold truncate">{page.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 p-6 pt-4 border-t border-[var(--border)]">
                        <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={isLoading}>
                            Annuler
                        </Button>
                        <Button type="submit" variant="primary" className="flex-1" isLoading={isLoading}>
                            {user ? 'Enregistrer' : 'Créer'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
