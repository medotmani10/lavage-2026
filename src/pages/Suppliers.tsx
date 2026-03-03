import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { showAlert, showConfirm } from '../stores/useDialogStore';
import { queueOperation } from '../lib/sync';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Plus, Search, Truck, Edit2, Trash2, Phone, Mail, MapPin, X, ArrowUpRight } from 'lucide-react';
import { PaySupplierModal } from '../components/PaySupplierModal';

interface Supplier {
  id: string;
  company_name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  address?: string;
  balance_owed: number;
  credit_limit?: number;
  active?: boolean;
}

export function Suppliers() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [payingSupplierId, setPayingSupplierId] = useState<string | null>(null);

  const { data: rawSuppliers, isLoading } = useSupabaseData<Supplier>('suppliers');
  const suppliers = rawSuppliers.filter(s => s.active !== false).sort((a, b) => a.company_name.localeCompare(b.company_name));

  const filteredSuppliers = suppliers.filter((supplier) => {
    const query = searchQuery.toLowerCase();
    return (
      supplier.company_name.toLowerCase().includes(query) ||
      supplier.contact_person?.toLowerCase().includes(query) ||
      supplier.phone.toLowerCase().includes(query) ||
      supplier.email?.toLowerCase().includes(query)
    );
  });

  const handleDelete = async (supplier: Supplier) => {
    if (!(await showConfirm(t('messages.deleteConfirm')))) return;

    await queueOperation('suppliers', 'UPDATE', { ...supplier, active: false });
  };

  const totalBalance = suppliers.reduce((sum, s) => sum + s.balance_owed, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{t('navigation.suppliers')}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">
            {filteredSuppliers.length} {t('suppliers.total')}
          </p>
        </div>

        <Button onClick={() => {
          setEditingSupplier(null);
          setShowModal(true);
        }}>
          <Plus className="w-5 h-5 mr-2" />
          {t('supplier.addSupplier')}
        </Button>
      </div>

      {/* Stats */}
      <Card className="p-6 bg-gradient-to-br from-primary-500/10 to-[var(--bg-surface)] border-primary-500/20 shadow-[var(--shadow-glow-orange)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-primary-400 font-bold uppercase tracking-wider">{t('suppliers.totalBalance')}</p>
            <p className="text-3xl font-black text-white mt-1">{totalBalance.toLocaleString()} <span className="text-lg text-[var(--text-muted)]">DZD</span></p>
          </div>
          <div className="w-16 h-16 bg-primary-500/20 border border-primary-500/30 rounded-2xl flex items-center justify-center transform rotate-3">
            <Truck className="w-8 h-8 text-primary-500" />
          </div>
        </div>
      </Card>

      {/* Search */}
      <Card className="p-2 border-[var(--border-lg)] bg-[var(--bg-panel)] shadow-sm">
        <Input
          type="text"
          placeholder={t('suppliers.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="w-5 h-5 text-gray-500" />}
          className="bg-[var(--bg-base)] border-none"
        />
      </Card>

      {/* Suppliers Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-[var(--text-muted)]">
            <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="font-medium animate-pulse">{t('common.loading')}</p>
          </div>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <Card className="p-16 text-center border-dashed border-[var(--border-lg)] bg-[var(--bg-panel)]/50">
          <Truck className="w-16 h-16 mx-auto mb-4 text-[var(--text-muted)] opacity-50" />
          <p className="text-[var(--text-secondary)] font-medium text-lg">{t('common.noData')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              onEdit={() => {
                setEditingSupplier(supplier);
                setShowModal(true);
              }}
              onDelete={() => handleDelete(supplier)}
              onPay={() => {
                setPayingSupplierId(supplier.id);
                setShowPayModal(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => {
            setShowModal(false);
            setEditingSupplier(null);
          }}
        />
      )}

      {showPayModal && (
        <PaySupplierModal
          supplierId={payingSupplierId || undefined}
          onClose={() => {
            setShowPayModal(false);
            setPayingSupplierId(null);
          }}
        />
      )}
    </div>
  );
}

interface SupplierCardProps {
  supplier: Supplier;
  onEdit: () => void;
  onDelete: () => void;
  onPay: () => void;
}

function SupplierCard({ supplier, onEdit, onDelete, onPay }: SupplierCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-5 border-[var(--border-lg)] bg-[var(--bg-panel)] hover:border-primary-500/50 hover:bg-[var(--bg-hover)] transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl flex items-center justify-center group-hover:bg-primary-500/10 group-hover:border-primary-500/30 transition-colors">
            <Truck className="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg leading-tight">{supplier.company_name}</h3>
            {supplier.contact_person && (
              <p className="text-sm font-medium text-[var(--text-secondary)] mt-0.5">{supplier.contact_person}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {supplier.balance_owed > 0 && (
            <button
              onClick={onPay}
              className="p-2 hover:bg-success-500/10 rounded-lg transition-colors border border-transparent hover:border-success-500/30"
              title="Payer une partie"
            >
              <ArrowUpRight className="w-4 h-4 text-success-500" />
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-2 hover:bg-primary-500/10 rounded-lg transition-colors border border-transparent hover:border-primary-500/30"
          >
            <Edit2 className="w-4 h-4 text-primary-400" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-danger-500/10 rounded-lg transition-colors border border-transparent hover:border-danger-500/30"
          >
            <Trash2 className="w-4 h-4 text-danger-400" />
          </button>
        </div>
      </div>

      <div className="space-y-2.5 text-sm mb-4">
        <a
          href={`tel:${supplier.phone.replace(/\s+/g, '')}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2.5 text-[var(--text-secondary)] font-medium p-2 bg-[var(--bg-base)] rounded-lg border border-[var(--border)] hover:border-primary-500/50 hover:text-primary-400 transition-colors"
        >
          <Phone className="w-4 h-4 text-primary-400 shrink-0" />
          <span>{supplier.phone}</span>
        </a>
        {supplier.email && (
          <div className="flex items-center gap-2.5 text-[var(--text-secondary)] font-medium p-2 bg-[var(--bg-base)] rounded-lg border border-[var(--border)]">
            <Mail className="w-4 h-4 text-primary-400 shrink-0" />
            <span className="truncate">{supplier.email}</span>
          </div>
        )}
        {supplier.address && (
          <div className="flex items-center gap-2.5 text-[var(--text-secondary)] font-medium p-2 bg-[var(--bg-base)] rounded-lg border border-[var(--border)]">
            <MapPin className="w-4 h-4 text-primary-400 shrink-0" />
            <span className="truncate">{supplier.address}</span>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-[var(--border)]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('supplier.balanceOwed')}</span>
            <span className={`font-black text-lg ${supplier.balance_owed > 0 ? 'text-warning-500' : 'text-success-500'}`}>
              {supplier.balance_owed.toLocaleString()} DZD
            </span>
          </div>
          {supplier.credit_limit && (
            <div className="flex items-center justify-between border-t border-[var(--border)] border-dashed pt-2 mt-2">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{t('supplier.creditLimit')}</span>
              <span className="font-bold text-[var(--text-secondary)] text-sm">{supplier.credit_limit.toLocaleString()} DZD</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

interface SupplierModalProps {
  supplier: Supplier | null;
  onClose: () => void;
}

function SupplierModal({ supplier, onClose }: SupplierModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    company_name: supplier?.company_name || '',
    contact_person: supplier?.contact_person || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    address: supplier?.address || '',
    credit_limit: supplier?.credit_limit?.toString() || '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const data = {
      ...formData,
      credit_limit: parseFloat(formData.credit_limit) || 0,
      balance_owed: supplier?.balance_owed || 0,
    };

    try {
      if (supplier) {
        await queueOperation('suppliers', 'UPDATE', { ...supplier, ...data, updated_at: new Date().toISOString() });
      } else {
        await queueOperation('suppliers', 'INSERT', {
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lg)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)] shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary-500" />
            {supplier ? t('supplier.editSupplier') : t('supplier.addSupplier')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-panel)] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray">
          <Input
            label={t('supplier.companyName')}
            value={formData.company_name}
            onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            required
          />

          <Input
            label={t('supplier.contactPerson')}
            value={formData.contact_person}
            onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('supplier.phone')}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
            <Input
              label={t('supplier.email')}
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              {t('supplier.address')}
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 bg-[var(--bg-base)] border border-[var(--border-lg)] rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none text-white text-sm"
            />
          </div>

          <Input
            label={t('supplier.creditLimit')}
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
              {supplier ? t('common.save') : t('common.add')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
