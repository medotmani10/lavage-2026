import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useQueueStore } from '../stores/useQueueStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { Button } from '../components/Button';
import { TicketCard } from './TicketCard';
import { AddTicketModal } from './AddTicketModal';
import { TicketFilters } from './TicketFilters';
import { RefreshCw, Plus, Ticket, PlayCircle, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import type { TicketStatus, TicketPriority } from '../types';

interface ColumnHeaderProps {
  title: string;
  count: number;
  colorClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ColumnHeader = ({ title, count, colorClass, icon: Icon }: ColumnHeaderProps) => (
  <div className="flex items-center justify-between mb-4 border-b border-[var(--border)] pb-3">
    <div className="flex items-center gap-2">
      <Icon className={`w-5 h-5 ${colorClass}`} />
      <h2 className="text-lg font-semibold text-white">{title}</h2>
    </div>
    <span className="bg-[var(--bg-panel)] text-[var(--text-secondary)] border border-[var(--border)] px-2.5 py-0.5 rounded-full text-xs font-bold">
      {count}
    </span>
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-surface)] border border-dashed border-[var(--border-lg)] rounded-xl">
    <Ticket className="w-10 h-10 mb-3 text-[var(--text-muted)] opacity-50" />
    <p className="text-sm font-medium text-[var(--text-secondary)]">{text}</p>
  </div>
);

export function Queue() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { tickets, isLoading, fetchTickets, subscribeToTickets } = useQueueStore();

  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<TicketPriority | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { settings } = useSettingsStore();

  const isStationOpen = (() => {
    if (!settings) return true; // Default to true if settings aren't loaded yet

    const now = new Date();
    const currentDayConfigDayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const currentDayName = currentDayConfigDayNames[now.getDay()];

    if (!settings.working_days.includes(currentDayName)) {
      return false;
    }

    if (settings.opening_time && settings.closing_time) {
      const [openHour, openMinute] = settings.opening_time.split(':').map(Number);
      const [closeHour, closeMinute] = settings.closing_time.split(':').map(Number);

      const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
      const openTimeInMinutes = openHour * 60 + openMinute;
      const closeTimeInMinutes = closeHour * 60 + closeMinute;

      return currentTimeInMinutes >= openTimeInMinutes && currentTimeInMinutes <= closeTimeInMinutes;
    }

    return true;
  })();

  useEffect(() => {
    fetchTickets();
    const unsubscribe = subscribeToTickets();

    if (searchParams.get('new') === 'true') {
      setTimeout(() => {
        setShowAddModal(true);
        // Clean up the URL parameter but keep the modal open
        setSearchParams({});
      }, 0);
    }

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter tickets
  const filteredTickets = tickets.filter((ticket) => {
    if (selectedStatus !== 'all' && ticket.status !== selectedStatus) return false;
    if (selectedPriority !== 'all' && ticket.priority !== selectedPriority) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const customerName = ticket.customer?.full_name?.toLowerCase() || '';
      const plateNumber = ticket.vehicle?.plate_number?.toLowerCase() || '';
      const ticketNumber = ticket.ticket_number?.toLowerCase() || '';

      return (
        customerName.includes(query) ||
        plateNumber.includes(query) ||
        ticketNumber.includes(query)
      );
    }
    return true;
  });

  // Group tickets by status
  const pendingTickets = filteredTickets.filter((t) => t.status === 'pending');
  const inProgressTickets = filteredTickets.filter((t) => t.status === 'in_progress');
  const completedTickets = filteredTickets.filter((t) => t.status === 'completed');



  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{t('queue.currentQueue')}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Gérez et suivez l'avancement des véhicules
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {!isStationOpen && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-warning-500/10 border border-warning-500/20 text-warning-400 text-sm font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Hors heures de travail</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => fetchTickets()} isLoading={isLoading}>
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Actualiser</span>
            </Button>
            <Button variant="primary" onClick={() => setShowAddModal(true)} disabled={!isStationOpen}>
              <Plus className="w-4 h-4" />
              Nouveau Client
            </Button>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <TicketFilters
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedPriority={selectedPriority}
        onPriorityChange={setSelectedPriority}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* ── Queue Columns ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Pending */}
        <div className="space-y-3 p-4 rounded-[var(--radius-lg)] bg-[var(--bg-base)] border border-[var(--border)]">
          <ColumnHeader title={t('common.pending')} count={pendingTickets.length} colorClass="text-warning-500" icon={Clock} />
          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray">
            {pendingTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} onUpdateStatus={useQueueStore.getState().updateTicketStatus} />
            ))}
            {pendingTickets.length === 0 && <EmptyState text="Aucun véhicule en attente" />}
          </div>
        </div>

        {/* In Progress */}
        <div className="space-y-3 p-4 rounded-[var(--radius-lg)] bg-[var(--bg-base)] border border-primary-500/20 shadow-[var(--shadow-glow-orange)]">
          <ColumnHeader title={t('queue.inProgress')} count={inProgressTickets.length} colorClass="text-primary-500" icon={PlayCircle} />
          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray">
            {inProgressTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} onUpdateStatus={useQueueStore.getState().updateTicketStatus} />
            ))}
            {inProgressTickets.length === 0 && <EmptyState text="Aucun service en cours" />}
          </div>
        </div>

        {/* Completed */}
        <div className="space-y-3 p-4 rounded-[var(--radius-lg)] bg-[var(--bg-base)] border border-[var(--border)]">
          <ColumnHeader title={t('common.completed')} count={completedTickets.length} colorClass="text-success-500" icon={CheckCircle} />
          <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray">
            {completedTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} onUpdateStatus={useQueueStore.getState().updateTicketStatus} />
            ))}
            {completedTickets.length === 0 && <EmptyState text="Aucun véhicule terminé" />}
          </div>
        </div>

      </div>

      {showAddModal && <AddTicketModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
