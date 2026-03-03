/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useAuthStore } from '../stores/useAuthStore';
import {
  TrendingUp,
  Clock,
  CheckCircle,
  Users,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useSettingsStore } from '../stores/useSettingsStore';
import { X, Calendar, ArrowUpRight } from 'lucide-react';
import { PaySupplierModal } from '../components/PaySupplierModal';
import { CollectDebtModal } from '../components/CollectDebtModal';


export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();

  const [activeModal, setActiveModal] = useState<'daily' | 'total' | null>(null);
  const [showPaySupplierModal, setShowPaySupplierModal] = useState(false);
  const [showCollectDebtModal, setShowCollectDebtModal] = useState(false);

  // Fetch raw data
  const { data: ticketsData, isLoading: ticketsLoading } = useSupabaseData<any>('queue_tickets');
  const { data: customersData, isLoading: customersLoading } = useSupabaseData<any>('customers');
  const { data: productsData, isLoading: productsLoading } = useSupabaseData<any>('products');
  const { data: transactionsData, isLoading: transactionsLoading } = useSupabaseData<any>('financial_transactions');

  const loading = ticketsLoading || customersLoading || productsLoading || transactionsLoading;

  // Calculate stats from the arrays
  const stats = (() => {
    try {
      const tickets = ticketsData || [];
      const customersCount = (customersData || []).filter((c: any) => c.active !== false).length;
      const stockLowCount = (productsData || []).filter((p: any) => p.stock_quantity <= 5 && p.active !== false).length;

      const now = new Date();

      // Calculate start of working day based on settings
      const todayStart = new Date();
      if (settings?.opening_time) {
        const [hours, minutes] = settings.opening_time.split(':').map(Number);
        todayStart.setHours(hours, minutes, 0, 0);

        // If current time is before opening time, we are still in the previous "working day" shift, 
        // but for simplicity, usually stats reset at midnight or opening time.
        // Let's assume stats are for the current day starting at opening time.
        if (now < todayStart) {
          todayStart.setDate(todayStart.getDate() - 1);
        }
      } else {
        todayStart.setHours(0, 0, 0, 0);
      }

      const completedTickets = tickets.filter((t: any) => t.status === 'completed');
      const todayCompleted = completedTickets.filter((t: any) => t.completed_at && new Date(t.completed_at) >= todayStart);

      const todayTickets = tickets.filter((t: any) => t.created_at && new Date(t.created_at) >= todayStart);
      const recentActivity = [...todayTickets].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

      const firstDayOfMonth = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
      const monthlyCompleted = completedTickets.filter((t: any) => t.completed_at && new Date(t.completed_at) >= firstDayOfMonth);

      // Financial Transactions (Debt Collections etc.)
      const financialTransactions = transactionsData || [];
      const dailyFinRevenue = financialTransactions
        .filter((tx: any) => tx.type === 'revenue' && tx.created_at && new Date(tx.created_at) >= todayStart)
        .reduce((s: number, tx: any) => s + (tx.amount || 0), 0);

      const monthlyFinRevenue = financialTransactions
        .filter((tx: any) => tx.type === 'revenue' && tx.created_at && new Date(tx.created_at) >= firstDayOfMonth)
        .reduce((s: number, tx: any) => s + (tx.amount || 0), 0);

      return {
        daily_revenue: todayCompleted.reduce((s: number, t: any) => s + (t.paid_amount || 0), 0) + dailyFinRevenue,
        monthly_revenue: monthlyCompleted.reduce((s: number, t: any) => s + (t.paid_amount || 0), 0) + monthlyFinRevenue,
        current_queue: todayTickets.filter((t: any) => ['pending', 'in_progress'].includes(t.status)).length,
        completed_today: todayCompleted.length,
        total_customers: customersCount,
        low_stock: stockLowCount,
        pending_debts: 0,
        recentActivity: recentActivity
      };
    } catch (e) {
      console.error(e);
      return {
        daily_revenue: 0,
        monthly_revenue: 0,
        current_queue: 0,
        completed_today: 0,
        total_customers: 0,
        low_stock: 0,
        pending_debts: 0,
        recentActivity: [] as any[]
      };
    }
  })();


  const statCards = [
    {
      label: "Revenu du jour",
      value: `${stats.daily_revenue.toLocaleString()} DZD`,
      icon: DollarSign,
      iconColor: 'text-success-500',
      iconBg: 'bg-success-500/10',
      trend: '+12%',
      trendUp: true,
      onClick: () => setActiveModal('daily'),
    },
    {
      label: "File d'attente",
      value: stats.current_queue.toString(),
      icon: Clock,
      iconColor: 'text-primary-500',
      iconBg: 'bg-primary-500/10',
      trend: 'En cours',
      trendUp: null,
      onClick: () => navigate('/queue'),
    },
    {
      label: "Terminés aujourd'hui",
      value: stats.completed_today.toString(),
      icon: CheckCircle,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/10',
      trend: 'Tickets',
      trendUp: null,
      onClick: () => navigate('/queue'),
    },
    {
      label: "Total clients",
      value: stats.total_customers.toString(),
      icon: Users,
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-500/10',
      trend: 'Inscrits',
      trendUp: null,
      onClick: () => navigate('/customers'),
    },
    {
      label: "Stock critique",
      value: stats.low_stock.toString(),
      icon: AlertTriangle,
      iconColor: 'text-warning-500',
      iconBg: 'bg-warning-500/10',
      trend: 'Produits',
      trendUp: null,
      onClick: () => navigate('/inventory'),
    },
    {
      label: "Revenus totaux",
      value: `${stats.monthly_revenue.toLocaleString()} DZD`,
      icon: TrendingUp,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-500/10',
      trend: 'Ce mois',
      trendUp: true,
      onClick: () => setActiveModal('total'),
    },
  ];

  const quickActions = [
    { label: "Nouveau ticket", icon: ShoppingCart, href: '/queue?new=true', iconBg: 'bg-primary-500/10', iconColor: 'text-primary-500', border: 'border-primary-500/20' },
    { label: "File d'attente", icon: Clock, href: '/queue', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500', border: 'border-blue-500/20' },
    { label: "Ajouter client", icon: Users, href: '/customers', iconBg: 'bg-success-500/10', iconColor: 'text-success-500', border: 'border-success-500/20' },
    { label: "Encaisser dette", icon: DollarSign, onClick: () => setShowCollectDebtModal(true), iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', border: 'border-emerald-500/20' },
    { label: "Payer fourn.", icon: ArrowUpRight, onClick: () => setShowPaySupplierModal(true), iconBg: 'bg-danger-500/10', iconColor: 'text-danger-500', border: 'border-danger-500/20' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Bonjour, <span className="text-gradient">{user?.full_name?.split(' ')[0] || 'Admin'}</span> 👋
          </h1>
          <p className="text-sm mt-1 text-[var(--text-muted)]">
            {new Date().toLocaleDateString('fr-DZ', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Button onClick={() => navigate('/queue?new=true')} size="md" className="shrink-0 w-full sm:w-auto">
          <ShoppingCart className="w-4 h-4" />
          Nouveau ticket
        </Button>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((s, index) => (
          <div
            key={index}
            onClick={s.onClick}
            className={`bg-[var(--bg-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 transition-all duration-300 hover:border-primary-500/50 hover:bg-primary-500/5 hover:-translate-y-1 hover:shadow-[var(--shadow-glow-orange)] relative overflow-hidden group cursor-pointer`}
          >
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${s.iconBg}`}>
              <s.icon className={`w-6 h-6 ${s.iconColor}`} />
            </div>
            {/* Value */}
            {loading ? (
              <div className="h-8 w-2/3 bg-[var(--bg-panel)] animate-pulse rounded-md mb-2" />
            ) : (
              <p className="text-2xl font-bold text-white leading-tight mb-1 truncate">{s.value}</p>
            )}
            <p className="text-sm font-medium text-[var(--text-muted)] line-clamp-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Quick Actions + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card title="Actions rapides" className="lg:col-span-1 h-full">
          <div className="grid grid-cols-2 gap-3 h-full">
            {quickActions.map((a) => (
              <button
                key={a.label}
                onClick={a.onClick ? a.onClick : () => navigate(a.href!)}
                className={`flex flex-col items-center justify-center gap-3 p-4 rounded-[var(--radius)] transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] border ${a.border} ${a.iconBg}`}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5">
                  <a.icon className={`w-5 h-5 ${a.iconColor}`} />
                </div>
                <span className="text-sm font-semibold text-[var(--text-secondary)] text-center leading-tight">
                  {a.label}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* Activity */}
        <Card
          title="Activité récente"
          description="Derniers tickets de la journée"
          className="lg:col-span-2 h-full"
          action={
            <button
              onClick={() => navigate('/queue')}
              className="flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300 transition-colors font-medium"
            >
              Voir tout <ArrowRight className="w-4 h-4" />
            </button>
          }
        >
          {stats.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((ticket, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border)]">
                  <div>
                    <p className="font-semibold text-white">Ticket {ticket.ticket_number ? `#${ticket.ticket_number}` : `#${ticket.id.split('-')[0]}`}</p>
                    <p className="text-sm text-[var(--text-muted)]">{new Date(ticket.created_at).toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-success-400">{ticket.total_amount} DZD</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${ticket.status === 'completed' ? 'bg-success-500/20 text-success-500' : ticket.status === 'in_progress' ? 'bg-blue-500/20 text-blue-500' : 'bg-warning-500/20 text-warning-500'}`}>
                      {ticket.status === 'completed' ? 'Terminé' : ticket.status === 'in_progress' ? 'En cours' : 'En attente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[220px] gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center border border-dashed border-[var(--border-lg)] bg-[var(--bg-panel)]">
                <Activity className="w-8 h-8 text-[var(--text-muted)]" />
              </div>
              <p className="text-[var(--text-muted)] text-base">
                Aucune activité récente pour le moment.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Modals for Daily and Total Revenue */}
      {activeModal === 'daily' && <DailyRevenueModal tickets={ticketsData} onClose={() => setActiveModal(null)} />}
      {activeModal === 'total' && <TotalRevenueModal tickets={ticketsData} onClose={() => setActiveModal(null)} />}

      {showPaySupplierModal && (
        <PaySupplierModal onClose={() => setShowPaySupplierModal(false)} />
      )}

      {showCollectDebtModal && (
        <CollectDebtModal onClose={() => setShowCollectDebtModal(false)} />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------------------------------
// Daily Revenue Modal Component
// -----------------------------------------------------------------------------------------------------
function DailyRevenueModal({ tickets, onClose }: { tickets: any[], onClose: () => void }) {
  const { settings } = useSettingsStore();

  const transactions = useMemo(() => {
    if (!tickets) return [];

    const todayStart = new Date();
    if (settings?.opening_time) {
      const [hours, minutes] = settings.opening_time.split(':').map(Number);
      todayStart.setHours(hours, minutes, 0, 0);
      const now = new Date();
      if (now < todayStart) {
        todayStart.setDate(todayStart.getDate() - 1);
      }
    } else {
      todayStart.setHours(0, 0, 0, 0);
    }

    return tickets
      .filter((t: any) => t.status === 'completed' && t.completed_at && new Date(t.completed_at) >= todayStart)
      .sort((a: any, b: any) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
  }, [tickets, settings]);

  const total = transactions.reduce((acc, t) => acc + (t.paid_amount || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lg)] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-success-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Revenu du jour</h2>
              <p className="text-sm text-[var(--text-muted)]">Aujourd'hui depuis {settings?.opening_time || '00:00'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-white rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 bg-success-500/5 border-b border-[var(--border)] flex justify-between items-center shrink-0">
          <span className="text-lg font-semibold text-[var(--text-secondary)]">Total du jour</span>
          <span className="text-3xl font-bold text-success-400">{total.toLocaleString()} DZD</span>
        </div>

        <div className="overflow-y-auto p-6 flex-1 space-y-3">
          {transactions.length === 0 ? (
            <div className="text-center text-[var(--text-muted)] py-8">Aucune transaction terminée aujourd'hui.</div>
          ) : (
            transactions.map((tx: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl">
                <div>
                  <p className="font-bold text-white">Ticket #{tx.ticket_number}</p>
                  <p className="text-sm text-[var(--text-muted)]">{new Date(tx.completed_at).toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">+{tx.paid_amount?.toLocaleString()} DZD</p>
                  <span className={`text-xs px-2 py-1 rounded-md mt-1 inline-block ${tx.payment_method === 'cash' ? 'bg-success-500/20 text-success-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {tx.payment_method === 'cash' ? 'Espèces' : tx.payment_method === 'card' ? 'Carte' : 'Autre'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-[var(--border)] shrink-0 text-center">
          <Button variant="secondary" onClick={onClose} className="w-full">Fermer</Button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------------------------------
// Total Revenue Modal Component
// -----------------------------------------------------------------------------------------------------
function TotalRevenueModal({ tickets, onClose }: { tickets: any[], onClose: () => void }) {

  const aggregatedStats = useMemo(() => {
    if (!tickets) return [];

    const completed = tickets.filter((t: any) => t.status === 'completed' && t.completed_at);

    // Group by day (YYYY-MM-DD)
    const groups: Record<string, { date: Date, total: number, count: number }> = {};

    completed.forEach(t => {
      const d = new Date(t.completed_at);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      if (!groups[dateStr]) {
        groups[dateStr] = { date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), total: 0, count: 0 };
      }
      groups[dateStr].total += (t.paid_amount || 0);
      groups[dateStr].count += 1;
    });

    return Object.values(groups).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [tickets]);

  const grandTotal = aggregatedStats.reduce((acc, curr) => acc + curr.total, 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-lg)] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Revenus historiques</h2>
              <p className="text-sm text-[var(--text-muted)]">Moyenne et totaux journaliers</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-[var(--text-muted)] hover:text-white rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 bg-emerald-500/5 border-b border-[var(--border)] flex justify-between items-center shrink-0">
          <span className="text-lg font-semibold text-[var(--text-secondary)]">Total Global</span>
          <span className="text-3xl font-bold text-emerald-400">{grandTotal.toLocaleString()} DZD</span>
        </div>

        <div className="overflow-y-auto p-6 flex-1 space-y-3">
          {aggregatedStats.length === 0 ? (
            <div className="text-center text-[var(--text-muted)] py-8">Aucune donnée historique.</div>
          ) : (
            aggregatedStats.map((stat, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-panel)] flex items-center justify-center border border-[var(--border-lg)]">
                    <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
                  </div>
                  <div>
                    <p className="font-bold text-white capitalize">{stat.date.toLocaleDateString('fr-DZ', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    <p className="text-sm text-[var(--text-muted)]">{stat.count} tickets</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-400">{stat.total.toLocaleString()} DZD</p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-[var(--border)] shrink-0 text-center">
          <Button variant="secondary" onClick={onClose} className="w-full">Fermer</Button>
        </div>
      </div>
    </div>
  );
}
