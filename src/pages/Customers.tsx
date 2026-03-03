import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { showAlert, showConfirm } from '../stores/useDialogStore';
import { queueOperation } from '../lib/sync';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Plus, Search, User, Mail, MapPin, Edit2, Trash2, Car, History } from 'lucide-react';
import { CustomerHistoryPanel } from './CustomerHistoryPanel';
import { CustomerVehiclesPanel } from './CustomerVehiclesPanel';
import type { Customer } from '../types';

export function Customers() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [vehiclesCustomer, setVehiclesCustomer] = useState<Customer | null>(null);

  const { data: allCustomers, isLoading } = useSupabaseData<Customer>('customers');
  const customers = allCustomers.filter(c => (c as any).active !== false).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

  const filteredCustomers = customers.filter((customer) => {
    const query = searchQuery.toLowerCase();
    return (
      (customer.full_name || '').toLowerCase().includes(query) ||
      customer.phone.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query)
    );
  });

  const handleDelete = async (customer: Customer) => {
    if (!(await showConfirm(t('messages.deleteConfirm')))) return;

    await queueOperation('customers', 'UPDATE', { ...customer, active: false });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{t('navigation.customers')}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">
            {filteredCustomers.length} {t('customers.total')}
          </p>
        </div>

        <Button onClick={() => {
          setEditingCustomer(null);
          setShowModal(true);
        }}>
          <Plus className="w-5 h-5 mr-2" />
          {t('customer.addCustomer')}
        </Button>
      </div>

      {/* Search */}
      <Card className="p-2 border-[var(--border-lg)] bg-[var(--bg-panel)] shadow-sm">
        <Input
          type="text"
          placeholder={t('customers.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="w-5 h-5 text-gray-400" />}
          className="bg-[var(--bg-base)] border-none"
        />
      </Card>

      {/* Customers Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-[var(--text-muted)]">
            <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="font-medium animate-pulse">{t('common.loading')}</p>
          </div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card className="p-16 text-center border-dashed border-[var(--border-lg)] bg-[var(--bg-panel)]/50">
          <User className="w-16 h-16 mx-auto mb-4 text-[var(--text-muted)] opacity-50" />
          <p className="text-[var(--text-secondary)] font-medium text-lg">{t('common.noData')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer as any}
              onEdit={(e) => {
                e.stopPropagation();
                setEditingCustomer(customer as any);
                setShowModal(true);
              }}
              onDelete={(e) => {
                e.stopPropagation();
                handleDelete(customer as any);
              }}
              onClick={() => setHistoryCustomer(customer as any)}
              onManageVehicles={() => setVehiclesCustomer(customer as any)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <CustomerModal
          customer={editingCustomer}
          onClose={() => {
            setShowModal(false);
            setEditingCustomer(null);
          }}
        />
      )}

      <CustomerHistoryPanel
        customer={historyCustomer!}
        isOpen={!!historyCustomer}
        onClose={() => setHistoryCustomer(null)}
      />

      <CustomerVehiclesPanel
        customer={vehiclesCustomer!}
        isOpen={!!vehiclesCustomer}
        onClose={() => setVehiclesCustomer(null)}
      />
    </div>
  );
}

interface CustomerCardProps {
  customer: Customer;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onClick: () => void;
  onManageVehicles: () => void;
}

function CustomerCard({ customer, onEdit, onDelete, onClick, onManageVehicles }: CustomerCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="group hover:-translate-y-1 transition-all duration-300 cursor-pointer border-[var(--border)] hover:border-primary-500/50 hover:shadow-[var(--shadow-glow-orange)] p-0 overflow-hidden">
      <div onClick={onClick} className="h-full flex flex-col p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[var(--bg-base)] border border-[var(--border-lg)] rounded-xl flex items-center justify-center shadow-inner group-hover:border-primary-500/50 transition-colors">
              <User className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h3 className="font-bold text-white group-hover:text-primary-400 transition-colors">{customer.full_name}</h3>
              <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">{customer.phone}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="p-1.5 hover:bg-[var(--bg-hover)] rounded-lg transition-colors border border-transparent hover:border-[var(--border-lg)]"
              title="Modifier"
            >
              <Edit2 className="w-4 h-4 text-[var(--text-secondary)] hover:text-white" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 hover:bg-danger-500/10 rounded-lg transition-colors border border-transparent hover:border-danger-500/30"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4 text-danger-400" />
            </button>
          </div>
        </div>

        <div className="space-y-2 text-xs mb-4">
          {customer.email && (
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Mail className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
              <span className="truncate">{customer.email}</span>
            </div>
          )}
          {customer.address && (
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <MapPin className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
              <span className="truncate">{customer.address}</span>
            </div>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-[var(--border)] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)] uppercase tracking-wider">{t('customer.currentBalance')}</span>
            <span className={`font-bold px-2 py-0.5 rounded ${customer.current_balance > 0 ? 'bg-danger-500/10 text-danger-500' : 'bg-success-500/10 text-success-500'}`}>
              {customer.current_balance.toLocaleString()} DA
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)] uppercase tracking-wider">{t('customer.loyaltyPoints')}</span>
            <span className="font-bold text-primary-400">{customer.loyalty_points.toLocaleString()} pts</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[var(--border)]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onManageVehicles();
            }}
            className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 py-2 rounded-lg transition-colors border border-primary-500/20"
          >
            <Car className="w-3.5 h-3.5" />
            {t('customers.viewVehicles')}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white bg-[var(--bg-base)] hover:bg-[var(--bg-hover)] py-2 rounded-lg transition-colors border border-[var(--border)]"
          >
            <History className="w-3.5 h-3.5" />
            Historique
          </button>
        </div>
      </div>
    </Card>
  );
}

interface CustomerModalProps {
  customer: Customer | null;
  onClose: () => void;
}

function CustomerModal({ customer, onClose }: CustomerModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    full_name: customer?.full_name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    credit_limit: customer?.credit_limit?.toString() || '0',
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const data = {
      ...formData,
      credit_limit: parseFloat(formData.credit_limit as unknown as string) || 0,
      current_balance: customer?.current_balance || 0,
      loyalty_points: customer?.loyalty_points || 0,
    };

    try {
      if (customer) {
        await queueOperation('customers', 'UPDATE', { ...customer, ...data, updated_at: new Date().toISOString() });
      } else {
        await queueOperation('customers', 'INSERT', {
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
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lg)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-6 border-b border-[var(--border)] shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-primary-500" />
            {customer ? t('customer.editCustomer') : t('customer.addCustomer')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh] scrollbar-thin scrollbar-thumb-gray">
          <Input
            label={t('customer.fullName')}
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
            placeholder="Nom & Prénom"
          />

          <Input
            label={t('customer.phone')}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
            placeholder="0550 00 00 00"
          />

          <Input
            label={t('customer.email')}
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="client@email.com"
          />

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              {t('customer.address')}
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 bg-[var(--bg-panel)] border border-[var(--border-lg)] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none text-white text-sm"
              placeholder="Adresse du client"
            />
          </div>

          <Input
            label={t('customer.creditLimit')}
            type="number"
            value={formData.credit_limit}
            onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
            min="0"
          />

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
              {customer ? t('common.save') : t('common.add')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
