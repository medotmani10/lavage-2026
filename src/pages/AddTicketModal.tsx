/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueueStore } from '../stores/useQueueStore';
import { showAlert } from '../stores/useDialogStore';
import { Button } from '../components/Button';
import { Select } from '../components/Select';
import { Input } from '../components/Input';
import { X, Check, Printer } from 'lucide-react';
import { printTicket } from '../lib/printTicket';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { queueOperation } from '../lib/sync';
import { supabase } from '../lib/supabase';


interface AddTicketModalProps {
  onClose: () => void;
}
export function AddTicketModal({ onClose }: AddTicketModalProps) {
  const { t } = useTranslation();
  const { createTicket, isLoading } = useQueueStore();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [priority, setPriority] = useState<'normal' | 'priority' | 'vip'>('normal');
  const [notes, setNotes] = useState('');
  const [requestedService, setRequestedService] = useState<'lavage' | 'vidange' | 'pneumatique'>('lavage');

  const { data: rawCustomers } = useSupabaseData<any>('customers');
  const { data: rawVehicles } = useSupabaseData<any>('vehicles');
  const { data: rawQueueTickets } = useSupabaseData<any>('queue_tickets');

  const customers = rawCustomers
    .filter(c => c.active !== false)
    .map(c => ({
      id: c.id,
      full_name: c.full_name || 'Inconnu',
      phone: c.phone || ''
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const vehicles = rawVehicles
    .filter(v => v.customer_id === selectedCustomerId)
    .map(v => ({
      id: v.id,
      plate_number: v.plate_number,
      brand: v.brand,
      model: v.model
    }))
    .sort((a, b) => a.plate_number.localeCompare(b.plate_number));

  // Quick Add State
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [newVehicleBrand, setNewVehicleBrand] = useState('');
  const [newVehicleModel, setNewVehicleModel] = useState('');
  const [newVehicleYear, setNewVehicleYear] = useState(new Date().getFullYear().toString());



  const handleQuickAddCustomer = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!newCustomerName) return;

    if (newCustomerPhone) {
      const existingCustomer = customers.find(c => c.phone === newCustomerPhone);
      if (existingCustomer) {
        showAlert(`Un client avec ce numéro de téléphone existe déjà: ${existingCustomer.full_name}`, 'warning');
        return;
      }
    }

    const newId = crypto.randomUUID();
    const newCustomer = {
      id: newId,
      full_name: newCustomerName,
      phone: newCustomerPhone || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      await queueOperation('customers', 'INSERT', newCustomer as any);
      // Only select after confirmed save
      setSelectedCustomerId(newId);
      setIsAddingCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
    } catch (error: any) {
      console.error('Customer insert error:', error);
      showAlert(`❌ Erreur: ${error.message}`, 'error');
      // Don't set selectedCustomerId — customer wasn't saved
    }
  };

  const handleQuickAddVehicle = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!newVehiclePlate || !selectedCustomerId) return;

    // Verify customer exists in DB before creating vehicle
    const { data: custCheck } = await supabase.from('customers').select('id').eq('id', selectedCustomerId).single();
    if (!custCheck) {
      showAlert('Le client sélectionné n\'existe pas encore en base. Veuillez d\'abord enregistrer le client.', 'error');
      return;
    }

    const newId = crypto.randomUUID();
    const newVehicle = {
      id: newId,
      customer_id: selectedCustomerId,
      plate_number: newVehiclePlate,
      brand: newVehicleBrand || 'Inconnu',
      model: newVehicleModel || 'Inconnu',
      year: parseInt(newVehicleYear) || new Date().getFullYear(),
      odometer: 0,
      created_at: new Date().toISOString()
    };

    try {
      await queueOperation('vehicles', 'INSERT', newVehicle as any);
      // Only select after confirmed save
      setSelectedVehicleId(newId);
      setIsAddingVehicle(false);
      setNewVehiclePlate('');
      setNewVehicleBrand('');
      setNewVehicleModel('');
      setNewVehicleYear(new Date().getFullYear().toString());
    } catch (error: any) {
      console.error('Vehicle insert error:', error);
      showAlert(`❌ Erreur: ${error.message}`, 'error');
      // Don't set selectedVehicleId — vehicle wasn't saved
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId || !selectedVehicleId) return;

    // Verify customer and vehicle exist in the DB before creating ticket
    // This prevents FK violation (409 Conflict) when quick-add failed silently
    const { data: custCheck } = await supabase.from('customers').select('id').eq('id', selectedCustomerId).single();
    if (!custCheck) {
      showAlert('❌ Le client sélectionné n\'existe pas en base de données. Veuillez l\'ajouter à nouveau.', 'error');
      return;
    }
    const { data: vehCheck } = await supabase.from('vehicles').select('id').eq('id', selectedVehicleId).single();
    if (!vehCheck) {
      showAlert('❌ Le véhicule sélectionné n\'existe pas en base de données. Veuillez l\'ajouter à nouveau.', 'error');
      return;
    }

    const ticket = await createTicket({
      customer_id: selectedCustomerId,
      vehicle_id: selectedVehicleId,
      priority,
      notes: notes || undefined,
      total_amount: 0,
      subtotal: 0,
      status: 'pending',
      requested_service: requestedService,
    });

    if (ticket) {
      if (typeof ticket === 'object') {
        const customer = customers.find(c => c.id === selectedCustomerId);
        const vehicle = vehicles.find(v => v.id === selectedVehicleId);

        // Count cars ahead locally
        const carsAhead = rawQueueTickets
          .filter(t => (t.status === 'pending' || t.status === 'in_progress') && new Date(t.created_at) < new Date(ticket.created_at))
          .length;

        // Use a slight delay to ensure the modal closes smoothly before print blocks the thread
        setTimeout(() => {
          printTicket(ticket, customer, vehicle, carsAhead);
        }, 300);
      }
      onClose();
    }
  };

  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: `${c.full_name} - ${c.phone}`,
  }));

  const vehicleOptions = vehicles.map((v) => ({
    value: v.id,
    label: `${v.plate_number} - ${v.brand} ${v.model}`,
  }));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lg)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)] shrink-0">
          <h2 className="text-xl font-bold text-white">
            {t('queue.addToQueue')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-panel)] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto scrollbar-thin scrollbar-thumb-gray">

          {/* Service Category */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[var(--text-secondary)]">Catégorie de Service</label>
            <div className="flex gap-2 p-1 bg-[var(--bg-panel)] rounded-xl border border-[var(--border)] overflow-hidden">
              {(() => {
                const categories = [
                  { id: 'lavage', label: 'Lavage', style: 'bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' },
                  { id: 'vidange', label: 'Vidange', style: 'bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]' },
                  { id: 'pneumatique', label: 'Pneumatique', style: 'bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]' }
                ];
                return categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setRequestedService(cat.id as any)}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg border transition-all duration-300 ${requestedService === cat.id ? cat.style : 'border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-base)]'}`}
                  >
                    {cat.label}
                  </button>
                ));
              })()}
            </div>
          </div>

          {/* Customer */}
          {isAddingCustomer ? (
            <div className="p-4 bg-[var(--bg-panel)] rounded-xl border border-primary-500/30 space-y-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-semibold text-primary-400">Nouveau Client</span>
                <button type="button" onClick={() => setIsAddingCustomer(false)} className="text-[var(--text-muted)] hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Nom & Prénom"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Ex: Ahmed"
                  autoFocus
                />
                <Input
                  label="Téléphone"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="Ex: 0550..."
                />
              </div>
              <Button type="button" variant="primary" onClick={(e) => handleQuickAddCustomer(e)} className="w-full" disabled={!newCustomerName}>
                <Check className="w-4 h-4 mr-2" /> Enregistrer le client
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Select
                  label={t('customer.selectCustomer')}
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  options={[
                    { value: '', label: t('customer.selectCustomer') },
                    ...customerOptions,
                  ]}
                  required
                />
              </div>
              <button type="button" onClick={() => setIsAddingCustomer(true)} className="p-3 mb-1 border border-[var(--border)] rounded-xl bg-[var(--bg-panel)] text-success-500 hover:bg-success-500/10 transition-colors" title="Ajouter client">
                +
              </button>
            </div>
          )}

          {/* Vehicle */}
          {isAddingVehicle && selectedCustomerId ? (
            <div className="p-4 bg-[var(--bg-panel)] rounded-xl border border-primary-500/30 space-y-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-semibold text-primary-400">Nouveau Véhicule</span>
                <button type="button" onClick={() => setIsAddingVehicle(false)} className="text-[var(--text-muted)] hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <Input
                label="Matricule"
                value={newVehiclePlate}
                onChange={(e) => setNewVehiclePlate(e.target.value)}
                placeholder="Ex: 12345 125 16"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Marque (Optionnel)"
                  value={newVehicleBrand}
                  onChange={(e) => setNewVehicleBrand(e.target.value)}
                  placeholder="Ex: Renault"
                />
                <Input
                  label="Modèle (Optionnel)"
                  value={newVehicleModel}
                  onChange={(e) => setNewVehicleModel(e.target.value)}
                  placeholder="Ex: Clio"
                />
              </div>
              <Input
                label="Année"
                type="number"
                value={newVehicleYear}
                onChange={(e) => setNewVehicleYear(e.target.value)}
                placeholder="Ex: 2024"
              />
              <Button type="button" variant="primary" onClick={(e) => handleQuickAddVehicle(e)} className="w-full" disabled={!newVehiclePlate}>
                <Check className="w-4 h-4 mr-2" /> Enregistrer le véhicule
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Select
                  label={t('vehicle.selectVehicle')}
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  options={[
                    { value: '', label: t('vehicle.selectVehicle') },
                    ...vehicleOptions,
                  ]}
                  required={!isAddingCustomer}
                  disabled={!selectedCustomerId || isLoading}
                />
              </div>
              <button
                type="button"
                onClick={() => setIsAddingVehicle(true)}
                disabled={!selectedCustomerId}
                className={`p-3 mb-1 border border-[var(--border)] rounded-xl transition-colors ${!selectedCustomerId ? 'opacity-50 cursor-not-allowed bg-[var(--bg-base)] text-gray-500' : 'bg-[var(--bg-panel)] text-primary-500 hover:bg-primary-500/10'}`}
                title="Ajouter véhicule"
              >
                +
              </button>
            </div>
          )}

          {/* Priority */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t('queue.priority.label')}
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'normal' | 'priority' | 'vip')}
              options={[
                { value: 'normal', label: t('queue.priority.normal') },
                { value: 'priority', label: t('queue.priority.priority') },
                { value: 'vip', label: t('queue.priority.vip') },
              ]}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--text-secondary)]">
              {t('common.notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Instructions spéciales (Optionnel)..."
              className="w-full px-4 py-3 rounded-xl transition-all duration-200 text-sm text-white placeholder-[var(--text-muted)] bg-[var(--bg-panel)] border border-[var(--border-lg)] focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-[var(--border)]">
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
              <Printer className="w-4 h-4 mr-2" />
              Confirmation et Impression
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
