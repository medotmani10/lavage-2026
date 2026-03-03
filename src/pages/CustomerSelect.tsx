/* eslint-disable @typescript-eslint/no-explicit-any */
import { useTranslation } from 'react-i18next';
import { usePOSStore } from '../stores/usePOSStore';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { User, Car, Briefcase } from 'lucide-react';
import { SearchableSelect } from '../components/SearchableSelect';

export function CustomerSelect() {
  const { t } = useTranslation();
  const { customerId, vehicleId, employeeId, setCustomer, setVehicle, setEmployee } = usePOSStore();

  const { data: rawCustomers } = useSupabaseData<any>('customers');
  const { data: rawEmployees } = useSupabaseData<any>('employees');
  const { data: rawVehicles } = useSupabaseData<any>('vehicles');

  const customers = rawCustomers
    .filter(c => c.active !== false)
    .map(c => ({
      value: c.id,
      label: `${c.full_name || 'Inconnu'} - ${c.phone}`
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const employees = rawEmployees
    .filter(e => e.active !== false)
    .map(e => ({
      value: e.id,
      label: `${e.full_name || 'Unknown'} - ${e.position}`
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const vehicles = rawVehicles
    .filter(v => v.customer_id === customerId)
    .map(v => ({
      value: v.id,
      label: `${v.plate_number} - ${v.brand} ${v.model}`
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const selectedCustomerData = rawCustomers.find(c => c.id === customerId);

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray pr-1 flex flex-col gap-3 pb-2">
        {/* Customer Select */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 px-1">
            <User className="w-4 h-4 text-primary-500" />
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">{t('customer.customer')}</h3>
          </div>
          <SearchableSelect
            value={customerId}
            onChange={(val) => {
              setCustomer(val);
              setVehicle(null);
            }}
            options={customers}
            placeholder={t('customer.selectCustomer')}
          />
        </div>

        {/* Vehicle Select */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 px-1">
            <Car className="w-4 h-4 text-blue-500" />
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">{t('vehicle.vehicle')}</h3>
          </div>
          <SearchableSelect
            value={vehicleId}
            onChange={setVehicle}
            options={vehicles}
            placeholder={customerId ? t('vehicle.selectVehicle') : "Sélectionner un client d'abord"}
          />
        </div>

        {/* Employee Select */}
        <div className="space-y-1.5 mb-8">
          <div className="flex items-center gap-2 px-1">
            <Briefcase className="w-4 h-4 text-purple-500" />
            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">Laveur / Technicien</h3>
          </div>
          <SearchableSelect
            value={employeeId}
            onChange={setEmployee}
            options={employees}
            placeholder="Assigner un employé"
          />
        </div>
      </div>

      {/* Debt Warning - Clean Block (Fixed at bottom) */}
      {selectedCustomerData && selectedCustomerData.current_balance > 0 && (
        <div className="p-3 bg-danger-500/10 border border-danger-500/20 rounded-xl animate-fade-in flex flex-col gap-1 mt-auto shrink-0 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-danger-500 animate-pulse" />
              <span className="text-xs font-bold text-danger-400">Solde Impayé:</span>
            </div>
            <span className="text-sm font-black text-danger-500">{selectedCustomerData.current_balance.toLocaleString()} DZD</span>
          </div>
        </div>
      )}
    </div>
  );
}
