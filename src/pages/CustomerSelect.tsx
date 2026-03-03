import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePOSStore } from '../stores/usePOSStore';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { User, Car, Briefcase } from 'lucide-react';
import { Select } from '../components/Select';

export function CustomerSelect() {
  const { t } = useTranslation();
  const { customerId, vehicleId, setCustomer, setVehicle } = usePOSStore();

  const [employeeId, setEmployeeId] = useState<string>('');
  const { data: rawCustomers } = useSupabaseData<any>('customers');
  const { data: rawEmployees } = useSupabaseData<any>('employees');
  const { data: rawVehicles } = useSupabaseData<any>('vehicles');

  const customers = rawCustomers
    .filter(c => c.active !== false)
    .map(c => ({ ...c, full_name: c.full_name || 'Inconnu' }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const employees = rawEmployees
    .filter(e => e.active !== false)
    .map(e => ({
      id: e.id,
      name: e.full_name || 'Unknown',
      position: e.position
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const vehicles = rawVehicles
    .filter(v => v.customer_id === customerId)
    .sort((a, b) => a.plate_number.localeCompare(b.plate_number));

  const selectedCustomer = customers.find((c) => c.id === customerId);

  return (
    <div className="space-y-4">
      {/* Customer Select */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-primary-500" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('customer.customer')}</h3>
        </div>
        <Select
          value={customerId || ''}
          onChange={(e) => {
            setCustomer(e.target.value || null);
            setVehicle(null);
          }}
          options={[
            { value: '', label: t('customer.selectCustomer') },
            ...customers.map(c => ({
              value: c.id,
              label: `${c.full_name} - ${c.phone}`
            }))
          ]}
          className="bg-[var(--bg-panel)] h-10 text-sm"
        />
      </div>

      {/* Debt Warning */}
      {selectedCustomer && selectedCustomer.current_balance > 0 && (
        <div className="p-3 bg-danger-500/10 border border-danger-500/30 rounded-xl space-y-1 mt-2 animate-fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="text-danger-400 font-semibold">{t('customer.currentBalance')} En Attente</span>
            <span className="font-black text-danger-500">{selectedCustomer.current_balance} DZD</span>
          </div>
          <div className="flex items-center justify-between text-xs opacity-70">
            <span className="text-danger-400">Limite de crédit</span>
            <span className="font-bold text-danger-400">{selectedCustomer.credit_limit} DZD</span>
          </div>
        </div>
      )}

      {/* Vehicle Select */}
      {customerId && (
        <div className="animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Car className="w-4 h-4 text-[#3b82f6]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('vehicle.vehicle')}</h3>
          </div>
          <Select
            value={vehicleId || ''}
            onChange={(e) => setVehicle(e.target.value || null)}
            options={[
              { value: '', label: t('vehicle.selectVehicle') },
              ...vehicles.map(v => ({
                value: v.id,
                label: `${v.plate_number} - ${v.brand} ${v.model}`
              }))
            ]}
            className="bg-[var(--bg-panel)] h-10 text-sm"
          />
        </div>
      )}

      {/* Employee Select */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Briefcase className="w-4 h-4 text-[#8b5cf6]" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Laveur / Technicien</h3>
        </div>
        <Select
          value={employeeId}
          onChange={(e) => {
            setEmployeeId(e.target.value);
            usePOSStore.getState().setEmployee(e.target.value || null);
          }}
          options={[
            { value: '', label: 'Aucun Assigné' },
            ...employees.map(emp => ({
              value: emp.id,
              label: `${emp.name} - ${emp.position}`
            }))
          ]}
          className="bg-[var(--bg-panel)] h-10 text-sm"
        />
      </div>
    </div>
  );
}
