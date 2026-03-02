import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { showAlert, showConfirm } from '../stores/useDialogStore';
import { queueOperation } from '../lib/sync';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Search, Wrench, Edit2, Trash2, Plus } from 'lucide-react';

interface Service {
    id: string;
    name: string;
    description?: string;
    price: number;
    cost: number;
    duration_minutes: number;
    commission_rate: number;
    category: 'lavage' | 'vidange' | 'pneumatique';
}

export function Services() {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [activeTab, setActiveTab] = useState<'lavage' | 'vidange' | 'pneumatique'>('lavage');

    const { data: rawServices, isLoading } = useSupabaseData<Service>('services');
    const services = rawServices.filter(s => (s as any).active !== false).sort((a, b) => a.name.localeCompare(b.name));

    const filteredServices = services.filter((service) => {
        const matchesTab = service.category === activeTab;
        const name = service.name;
        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    const handleDelete = async (service: Service) => {
        if (!(await showConfirm(t('messages.deleteConfirm')))) return;

        // To be implemented via useSupabaseData or direct mutation if needed, 
        // but for now keeping queueOperation approach for consistency
        await queueOperation('services', 'UPDATE', { ...service, active: false });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">{t('navigation.services')}</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">
                        {services.length} {t('inventory.total')}
                    </p>
                </div>

                <Button onClick={() => {
                    setEditingService(null);
                    setShowModal(true);
                }}>
                    <Plus className="w-5 h-5 mr-2" />
                    Ajouter un service
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 p-1 bg-[var(--bg-panel)] border border-[var(--border-lg)] rounded-xl w-fit">
                {(['lavage', 'vidange', 'pneumatique'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold capitalize transition-all duration-300 ${activeTab === tab
                            ? 'bg-[var(--bg-base)] text-primary-400 shadow-sm border border-[var(--border)]'
                            : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] border border-transparent'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Search */}
            <Card className="p-2 border-[var(--border-lg)] bg-[var(--bg-panel)] shadow-sm">
                <Input
                    type="text"
                    placeholder="Rechercher un service..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    icon={<Search className="w-5 h-5 text-gray-400" />}
                    className="bg-[var(--bg-base)] border-none"
                />
            </Card>

            {/* Services Table */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-center text-[var(--text-muted)]">
                        <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="font-medium animate-pulse">{t('common.loading')}</p>
                    </div>
                </div>
            ) : filteredServices.length === 0 ? (
                <Card className="p-16 text-center border-dashed border-[var(--border-lg)] bg-[var(--bg-panel)]/50">
                    <Wrench className="w-16 h-16 mx-auto mb-4 text-[var(--text-muted)] opacity-50" />
                    <p className="text-[var(--text-secondary)] font-medium text-lg">{t('common.noData')}</p>
                </Card>
            ) : (
                <Card className="overflow-hidden p-0 border-[var(--border)]">
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="bg-[var(--bg-panel)] border-b border-[var(--border)] uppercase text-[10px] tracking-wider text-[var(--text-secondary)] font-bold">
                                        <th className="px-6 py-4">Service</th>
                                        <th className="px-6 py-4">Prix de Vente</th>
                                        <th className="px-6 py-4">Coût</th>
                                        <th className="px-6 py-4">Durée (min)</th>
                                        <th className="px-6 py-4">Commission (%)</th>
                                        <th className="px-6 py-4 text-right">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {filteredServices.map((service) => (
                                        <tr key={service.id} className="hover:bg-[var(--bg-hover)] transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <p className="font-bold text-white text-sm">
                                                    {service.name}
                                                </p>
                                                {(service.description) && (
                                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate max-w-xs cursor-help" title={service.description}>
                                                        {service.description}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-primary-400">
                                                {service.price} DA
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-danger-400">
                                                {service.cost} DA
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-muted)] font-medium">
                                                {service.duration_minutes} min
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-success-400 font-bold">
                                                {service.commission_rate}%
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            setEditingService(service);
                                                            setShowModal(true);
                                                        }}
                                                        className="p-2 hover:bg-primary-500/10 rounded-lg transition-colors border border-transparent hover:border-primary-500/30"
                                                        title="Modifier"
                                                    >
                                                        <Edit2 className="w-4 h-4 text-primary-400" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(service)}
                                                        className="p-2 hover:bg-danger-500/10 rounded-lg transition-colors border border-transparent hover:border-danger-500/30"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-danger-400" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Card>
            )}

            {/* Modal */}
            {showModal && (
                <ServiceModal
                    service={editingService}
                    defaultCategory={activeTab}
                    onClose={() => {
                        setShowModal(false);
                        setEditingService(null);
                    }}
                />
            )}
        </div>
    );
}

interface ServiceModalProps {
    service: Service | null;
    defaultCategory: 'lavage' | 'vidange' | 'pneumatique';
    onClose: () => void;
}

function ServiceModal({ service, defaultCategory, onClose }: ServiceModalProps) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        name: service?.name || '',
        description: service?.description || '',
        price: service?.price?.toString() || '0',
        cost: service?.cost?.toString() || '0',
        duration_minutes: service?.duration_minutes?.toString() || '30',
        commission_rate: service?.commission_rate?.toString() || '0',
        category: service?.category || defaultCategory,
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const data: any = {
            name: formData.name,
            description: formData.description || null,
            price: parseFloat(formData.price) || 0,
            cost: parseFloat(formData.cost) || 0,
            duration_minutes: parseInt(formData.duration_minutes) || 30,
            commission_rate: parseFloat(formData.commission_rate) || 0,
            category: formData.category,
        };

        try {
            if (service) {
                await queueOperation('services', 'UPDATE', { ...service, ...data, updated_at: new Date().toISOString() });
            } else {
                await queueOperation('services', 'INSERT', {
                    id: crypto.randomUUID(),
                    ...data,
                    active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            }
            onClose();
        } catch (error) {
            console.error(error);
            showAlert(t('messages.saveError'), 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-lg)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-[var(--border)] shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-primary-500" />
                        {service ? "Modifier le service" : "Ajouter un service"}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray">

                    <div>
                        <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Catégorie</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                            className="w-full px-4 py-3 bg-[var(--bg-panel)] border border-[var(--border-lg)] rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-white text-sm cursor-pointer capitalize appearance-none"
                            required
                        >
                            <option value="lavage">Lavage</option>
                            <option value="vidange">Vidange</option>
                            <option value="pneumatique">Pneumatique</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <Input
                            label="Nom du service"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={2}
                                className="w-full px-4 py-3 bg-[var(--bg-panel)] border border-[var(--border-lg)] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none text-white text-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Prix de vente (DA)"
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            min="0"
                            step="0.01"
                            required
                        />
                        <Input
                            label="Coût interne (DA)"
                            type="number"
                            value={formData.cost}
                            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                            min="0"
                            step="0.01"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Durée estimée (minutes)"
                            type="number"
                            value={formData.duration_minutes}
                            onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                            min="1"
                            required
                        />
                        <Input
                            label="Taux de commission employé (%)"
                            type="number"
                            value={formData.commission_rate}
                            onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                            min="0"
                            max="100"
                            step="0.01"
                        />
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-[var(--border)] mt-6">
                        <Button
                            type="button"
                            variant="secondary"
                            className="flex-1"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            className="flex-1"
                            isLoading={isLoading}
                        >
                            {service ? t('common.save') : t('common.add')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
