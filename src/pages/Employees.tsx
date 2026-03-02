import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { showAlert, showConfirm } from '../stores/useDialogStore';
import { queueOperation } from '../lib/sync';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Plus, Search, User, Edit2, Trash2, Phone, DollarSign, TrendingUp, X } from 'lucide-react';

interface Employee {
  id: string;
  full_name: string;
  user_id?: string;
  position: string;
  phone: string;
  base_salary?: number;
  commission_rate: number;
  total_commissions: number;
  paid_commissions: number;
  pending_commissions: number;
  active: boolean;
  user?: {
    full_name: string;
    email: string;
  };
}

interface UserOption {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export function Employees() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const { data: rawEmployees, isLoading: isEmpLoading } = useSupabaseData<Employee>('employees');
  const { data: rawUsers, isLoading: isUserLoading } = useSupabaseData<UserOption>('users');

  const isLoading = isEmpLoading || isUserLoading;

  const employees = rawEmployees
    .filter(e => (e as any).active !== false)
    .map(e => {
      const user = rawUsers.find(u => u.id === e.user_id);
      return {
        ...e,
        user: user ? {
          full_name: user.full_name,
          email: user.email,
          role: user.role
        } : undefined
      };
    })
    .sort((a, b) => a.position.localeCompare(b.position));

  const userOptions = rawUsers
    .filter(u => (u as any).active !== false)
    .map(u => ({ id: u.id, full_name: u.full_name, email: u.email, role: u.role }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const filteredEmployees = employees.filter((employee) => {
    const query = searchQuery.toLowerCase();
    const name = employee.full_name?.toLowerCase() || '';
    const position = employee.position.toLowerCase();
    const phone = employee.phone.toLowerCase();

    return name.includes(query) || position.includes(query) || phone.includes(query);
  });

  const handleDelete = async (employee: Employee) => {
    if (!(await showConfirm(t('messages.deleteConfirm')))) return;

    await queueOperation('employees', 'UPDATE', { ...employee, active: false });
  };

  const totalPending = employees.reduce((sum, e) => sum + e.pending_commissions, 0);
  const totalPaid = employees.reduce((sum, e) => sum + e.paid_commissions, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{t('navigation.employees')}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">
            {filteredEmployees.length} {t('employees.total')}
          </p>
        </div>

        <Button onClick={() => {
          setEditingEmployee(null);
          setShowModal(true);
        }}>
          <Plus className="w-5 h-5 mr-2" />
          {t('employee.addEmployee')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-[var(--bg-surface)] border-[var(--border)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-500/10 border border-primary-500/20 rounded-xl flex items-center justify-center shadow-[var(--shadow-glow-orange)]">
              <User className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)] font-bold uppercase tracking-wider">{t('employees.activeEmployees')}</p>
              <p className="text-3xl font-black text-white mt-1">{employees.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-[var(--bg-surface)] border-[var(--border)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-warning-500/10 border border-warning-500/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-warning-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)] font-bold uppercase tracking-wider">{t('employee.pendingCommissions')}</p>
              <p className="text-3xl font-black text-warning-400 mt-1">{totalPending.toLocaleString()} <span className="text-lg opacity-50">DA</span></p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-[var(--bg-surface)] border-[var(--border)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-success-500/10 border border-success-500/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)] font-bold uppercase tracking-wider">{t('employee.paidCommissions')}</p>
              <p className="text-3xl font-black text-success-400 mt-1">{totalPaid.toLocaleString()} <span className="text-lg opacity-50">DA</span></p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-2 border-[var(--border-lg)] bg-[var(--bg-panel)] shadow-sm">
        <Input
          type="text"
          placeholder={t('employees.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="w-5 h-5 text-gray-500" />}
          className="bg-[var(--bg-base)] border-none"
        />
      </Card>

      {/* Employees Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-[var(--text-muted)]">
            <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="font-medium animate-pulse">{t('common.loading')}</p>
          </div>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <Card className="p-16 text-center border-dashed border-[var(--border-lg)] bg-[var(--bg-panel)]/50">
          <User className="w-16 h-16 mx-auto mb-4 text-[var(--text-muted)] opacity-50" />
          <p className="text-[var(--text-secondary)] font-medium text-lg">{t('common.noData')}</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 border-[var(--border)]">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[var(--bg-panel)] border-b border-[var(--border)] uppercase text-[10px] tracking-wider text-[var(--text-secondary)] font-bold">
                  <th className="px-6 py-4">{t('employee.fullName')}</th>
                  <th className="px-6 py-4">{t('employee.position')}</th>
                  <th className="px-6 py-4">{t('employee.phone')}</th>
                  <th className="px-6 py-4">{t('employee.commissionRate')}</th>
                  <th className="px-6 py-4">{t('employee.pendingCommissions')}</th>
                  <th className="px-6 py-4">{t('employee.paidCommissions')}</th>
                  <th className="px-6 py-4 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-[var(--bg-hover)] transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-bold text-white text-sm">{employee.full_name}</p>
                        {employee.user && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{employee.user.email}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-info-500/10 text-info-400 border border-info-500/20">
                        {employee.position}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] font-medium">
                        <Phone className="w-4 h-4 text-primary-400" />
                        {employee.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-white">
                      {employee.commission_rate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-warning-400 bg-warning-500/10 px-2 py-1 rounded border border-warning-500/20">
                        {employee.pending_commissions.toLocaleString()} DA
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-[var(--text-secondary)]">
                      {employee.paid_commissions.toLocaleString()} DA
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingEmployee(employee);
                            setShowModal(true);
                          }}
                          className="p-2 hover:bg-primary-500/10 rounded-lg transition-colors border border-transparent hover:border-primary-500/30"
                        >
                          <Edit2 className="w-4 h-4 text-primary-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(employee)}
                          className="p-2 hover:bg-danger-500/10 rounded-lg transition-colors border border-transparent hover:border-danger-500/30"
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
        </Card>
      )}

      {/* Modal */}
      {showModal && (
        <EmployeeModal
          employee={editingEmployee}
          userOptions={userOptions}
          onClose={() => {
            setShowModal(false);
            setEditingEmployee(null);
          }}
        />
      )}
    </div>
  );
}

interface EmployeeModalProps {
  employee: Employee | null;
  userOptions: UserOption[];
  onClose: () => void;
}

function EmployeeModal({ employee, userOptions, onClose }: EmployeeModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    user_id: employee?.user_id || '',
    full_name: employee?.full_name || '',
    position: employee?.position || '',
    phone: employee?.phone || '',
    base_salary: employee?.base_salary?.toString() || '',
    commission_rate: employee?.commission_rate?.toString() || '10',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    let finalFullName = formData.full_name.trim();

    if (!finalFullName && formData.user_id) {
      const selectedUser = userOptions.find(u => u.id === formData.user_id);
      if (selectedUser) {
        finalFullName = selectedUser.full_name;
      }
    }

    if (!finalFullName) {
      showAlert(t('employee.fullNameRequired', 'Le nom complet est obligatoire.'), 'warning');
      setIsLoading(false);
      return;
    }

    const data = {
      user_id: formData.user_id || null, // Ensure empty string becomes null
      full_name: finalFullName,
      position: formData.position,
      phone: formData.phone,
      base_salary: parseFloat(formData.base_salary) || 0,
      commission_rate: parseFloat(formData.commission_rate) || 0,
      total_commissions: employee?.total_commissions || 0,
      paid_commissions: employee?.paid_commissions || 0,
      pending_commissions: employee?.pending_commissions || 0,
    };

    try {
      if (employee) {
        await queueOperation('employees', 'UPDATE', { ...employee, ...data, updated_at: new Date().toISOString() });
      } else {
        await queueOperation('employees', 'INSERT', {
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

  const userOpts = userOptions
    .filter(u => !employee || u.id === employee.user_id)
    .map((u) => ({
      value: u.id,
      label: `${u.full_name} (${u.email})`,
    }));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lg)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)] shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-primary-500" />
            {employee ? t('employee.editEmployee') : t('employee.addEmployee')}
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
            label={t('employee.fullName') + ' *'}
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Mohamed Ali"
          />

          <Select
            label={t('employee.user') + ' (Optionnel)'}
            value={formData.user_id}
            onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
            options={[
              { value: '', label: t('employee.selectUser') },
              ...userOpts,
            ]}
          />

          <Input
            label={t('employee.position')}
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            placeholder="Technicien"
            required
          />

          <Input
            label={t('employee.phone')}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('employee.baseSalary')}
              type="number"
              value={formData.base_salary}
              onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
              min="0"
            />

            <Input
              label={t('employee.commissionRate')}
              type="number"
              value={formData.commission_rate}
              onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
              min="0"
              max="100"
              step="0.1"
              hint={t('employee.commissionRateHint')}
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
              {employee ? t('common.save') : t('common.add')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
