import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Button } from '../components/Button';
import { showConfirm } from '../stores/useDialogStore';
import { Clock, User, Car, PlayCircle, AlertCircle, CreditCard } from 'lucide-react';
import type { QueueTicket, TicketStatus } from '../types';
import { PaymentModal } from './PaymentModal';
import { usePOSStore } from '../stores/usePOSStore';

interface TicketCardProps {
  ticket: QueueTicket;
  onUpdateStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
}

export function TicketCard({ ticket, onUpdateStatus }: TicketCardProps) {
  const { t } = useTranslation();
  const { setCustomer, setVehicle } = usePOSStore();
  const [showPayment, setShowPayment] = useState(false);

  const openPayment = () => {
    // Load customer & vehicle into POS store so PaymentModal has access
    if (ticket.customer_id) setCustomer(ticket.customer_id);
    if (ticket.vehicle_id) setVehicle(ticket.vehicle_id);
    setShowPayment(true);
  };

  const getStatusBadge = () => {
    switch (ticket.status) {
      case 'pending': return 'badge-pending';
      case 'in_progress': return 'badge-progress';
      case 'completed': return 'badge-done';
      case 'cancelled': return 'badge-cancelled';
      default: return 'badge-progress';
    }
  };

  const getPriorityClass = () => {
    switch (ticket.priority) {
      case 'vip': return 'priority-vip';
      case 'priority': return 'priority-high';
      default: return 'priority-normal';
    }
  };

  const getWaitTime = () => {
    const created = new Date(ticket.created_at);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className={`ticket-card p-4 ${getPriorityClass()}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="min-w-0">
          <div className="flex flex-col items-start gap-1 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-lg">{ticket.ticket_number ? `#${ticket.ticket_number}` : '#...'}</span>

              {ticket.requested_service === 'lavage' && (
                <span className="badge bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px]">Lavage</span>
              )}
              {ticket.requested_service === 'vidange' && (
                <span className="badge bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px]">Vidange</span>
              )}
              {ticket.requested_service === 'pneumatique' && (
                <span className="badge bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px]">Pneumatique</span>
              )}

              {ticket.priority !== 'normal' && (
                <span className={`badge ${ticket.priority === 'vip' ? 'badge-vip' : 'badge-pending'} text-[10px]`}>
                  {t(`queue.priority.${ticket.priority}`)}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] font-medium">
              Le {new Date(ticket.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'long', year: 'numeric' })}
              {' à '}
              {new Date(ticket.created_at).toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <p className="text-sm text-[var(--text-secondary)] truncate font-semibold">
            {ticket.customer?.full_name || 'Client Passager'}
          </p>
        </div>
        <span className={`badge ${getStatusBadge()} shrink-0`}>
          {t(`common.${ticket.status}`)}
        </span>
      </div>

      {/* Vehicle Info */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-primary)] mb-4 bg-[var(--bg-panel)] p-2 rounded-lg border border-[var(--border)]">
        <div className="p-1.5 rounded-md bg-[var(--bg-hover)] text-[var(--text-muted)]">
          <Car className="w-4 h-4" />
        </div>
        <span className="font-medium truncate">
          {ticket.vehicle?.brand} {ticket.vehicle?.model} - {ticket.vehicle?.plate_number}
        </span>
      </div>

      {/* Meta Info */}
      <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)] mb-4">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>{getWaitTime()}</span>
        </div>

        {ticket.assigned_employee && (
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3.5 h-3.5" />
            <span className="truncate">{ticket.assigned_employee.user?.full_name}</span>
          </div>
        )}

        {ticket.total_amount > 0 && (
          <div className="col-span-2 font-bold text-orange-400 mt-1">
            {ticket.total_amount.toLocaleString()} DZD
          </div>
        )}
      </div>

      {/* Actions */}
      {
        ticket.status === 'pending' && (
          <div className="flex items-center gap-2 mt-auto">
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => onUpdateStatus(ticket.id, 'in_progress')}
            >
              <PlayCircle className="w-4 h-4" />
              <span>Démarrer</span>
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                if (await showConfirm(t('queue.confirmCancel'))) {
                  onUpdateStatus(ticket.id, 'cancelled');
                }
              }}
              title="Annuler"
            >
              <AlertCircle className="w-4 h-4" />
            </Button>
          </div>
        )
      }

      {
        ticket.status === 'in_progress' && (
          <Button
            variant="success"
            size="sm"
            className="w-full mt-auto"
            onClick={openPayment}
          >
            <CreditCard className="w-4 h-4" />
            <span>Encaisser & Terminer</span>
          </Button>
        )
      }

      {
        showPayment && (
          <PaymentModal
            ticketId={ticket.id}
            onClose={() => setShowPayment(false)}
          />
        )
      }

      {
        ticket.status === 'completed' && (
          <div className="text-xs text-[var(--text-muted)] text-center mt-2 border-t border-[var(--border)] pt-3">
            Terminé à: {new Date(ticket.completed_at!).toLocaleTimeString()}
          </div>
        )
      }
    </div >
  );
}
