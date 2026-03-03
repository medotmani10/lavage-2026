/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { useSettingsStore } from '../stores/useSettingsStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  Download,
  X
} from 'lucide-react';


interface DailyRevenue {
  date: string;
  ticket_count: number;
  gross_revenue: number;
  collected_amount: number;
}

export function Finance() {
  const { t } = useTranslation();
  const { settings } = useSettingsStore();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('week');
  const [activeModal, setActiveModal] = useState<'dailyRevenue' | 'dailyProfit' | 'pendingDebts' | 'supplierDebts' | null>(null);

  // Fetch all necessary data
  const { data: ticketsData, isLoading: isTicketsLoading } = useSupabaseData<any>('queue_tickets');
  const { data: ticketProductsData } = useSupabaseData<any>('ticket_products');
  const { data: ticketServicesData } = useSupabaseData<any>('ticket_services');
  const { data: productsData } = useSupabaseData<any>('products');
  const { data: servicesData } = useSupabaseData<any>('services');
  const { data: commissionsData } = useSupabaseData<any>('commissions');
  const { data: debtsData, isLoading: isDebtsLoading } = useSupabaseData<any>('debts');
  const { data: suppliersData, isLoading: isSuppliersLoading } = useSupabaseData<any>('suppliers');
  const { data: employeesData, isLoading: isEmployeesLoading } = useSupabaseData<any>('employees');
  const { data: transactionsData, isLoading: isTransactionsLoading } = useSupabaseData<any>('financial_transactions');

  const isLoading = isTicketsLoading || isDebtsLoading || isSuppliersLoading || isEmployeesLoading || isTransactionsLoading;

  // Helper: compute COST of a set of ticket IDs
  const computeCosts = (ticketIds: string[]) => {
    // Product costs: cost_price × quantity
    const productCost = (ticketProductsData || []).reduce((sum: number, tp: any) => {
      if (!ticketIds.includes(tp.ticket_id)) return sum;
      const product = (productsData || []).find((p: any) => p.id === tp.product_id);
      return sum + (Number(product?.cost_price) || 0) * (Number(tp.quantity) || 1);
    }, 0);

    // Service costs: cost × quantity
    const serviceCost = (ticketServicesData || []).reduce((sum: number, ts: any) => {
      if (!ticketIds.includes(ts.ticket_id)) return sum;
      const service = (servicesData || []).find((s: any) => s.id === ts.service_id);
      return sum + (Number(service?.cost) || 0) * (Number(ts.quantity) || 1);
    }, 0);

    // Commissions
    const commissionCost = (commissionsData || []).reduce((sum: number, c: any) => {
      if (!ticketIds.includes(c.ticket_id)) return sum;
      return sum + (Number(c.amount) || 0);
    }, 0);

    return productCost + serviceCost + commissionCost;
  };

  const stats = (() => {
    if (isLoading) return undefined;

    const now = new Date();
    const todayStart = new Date();
    if (settings?.opening_time) {
      const [hours, minutes] = settings.opening_time.split(':').map(Number);
      todayStart.setHours(hours, minutes, 0, 0);
      if (now < todayStart) {
        todayStart.setDate(todayStart.getDate() - 1);
      }
    } else {
      todayStart.setHours(0, 0, 0, 0);
    }

    const firstDayOfMonth = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

    const tickets = ticketsData || [];
    const completedTickets = tickets.filter((t: any) => t.status === 'completed');

    const getTicketDate = (t: any) => new Date(t.completed_at || t.updated_at || t.created_at).getTime();

    const ticketsToday = completedTickets.filter((t: any) => getTicketDate(t) >= todayStart.getTime());
    const ticketsMonth = completedTickets.filter((t: any) => getTicketDate(t) >= firstDayOfMonth.getTime());

    // Costs = product costs + service costs + commissions
    const ticket_daily_costs = computeCosts(ticketsToday.map((t: any) => t.id));
    const ticket_monthly_costs = computeCosts(ticketsMonth.map((t: any) => t.id));

    // Financial Transactions (Debt Collections, Supplier Payments, etc.)
    const transactions = transactionsData || [];

    const daily_fin_revenue = transactions
      .filter((tx: any) => tx.type === 'revenue' && tx.created_at && new Date(tx.created_at).getTime() >= todayStart.getTime())
      .reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);

    const monthly_fin_revenue = transactions
      .filter((tx: any) => tx.type === 'revenue' && tx.created_at && new Date(tx.created_at).getTime() >= firstDayOfMonth.getTime())
      .reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);

    const daily_fin_expenses = transactions
      .filter((tx: any) => tx.type === 'expense' && tx.created_at && new Date(tx.created_at).getTime() >= todayStart.getTime())
      .reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);

    const monthly_fin_expenses = transactions
      .filter((tx: any) => tx.type === 'expense' && tx.created_at && new Date(tx.created_at).getTime() >= firstDayOfMonth.getTime())
      .reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);

    const ticket_daily_revenue = ticketsToday.reduce((sum: number, t: any) => sum + (t.paid_amount || 0), 0);
    const ticket_monthly_revenue = ticketsMonth.reduce((sum: number, t: any) => sum + (t.paid_amount || 0), 0);
    const total_revenue = completedTickets.reduce((sum: number, t: any) => sum + (t.paid_amount || 0), 0);

    const daily_revenue = ticket_daily_revenue + daily_fin_revenue;
    const monthly_revenue = ticket_monthly_revenue + monthly_fin_revenue;
    const daily_costs = ticket_daily_costs + daily_fin_expenses;
    const monthly_costs = ticket_monthly_costs + monthly_fin_expenses;

    const debts = debtsData || [];
    const pending_debts = debts
      .filter((d: any) => d.status !== 'completed' && d.status !== 'cancelled')
      .reduce((sum: number, d: any) => sum + (d.remaining_amount || 0), 0);

    const suppliers = suppliersData || [];
    const supplier_debts = suppliers.reduce((sum: number, s: any) => sum + (s.balance_owed || 0), 0);

    const employees = employeesData || [];
    const pending_commissions = employees
      .filter((e: any) => e.active !== false)
      .reduce((sum: number, e: any) => sum + (e.pending_commissions || 0), 0);

    return {
      daily_revenue,
      monthly_revenue,
      total_revenue: total_revenue + transactions.filter((tx: any) => tx.type === 'revenue').reduce((s: number, tx: any) => s + (tx.amount || 0), 0),
      daily_profit: daily_revenue - daily_costs,
      monthly_profit: monthly_revenue - monthly_costs,
      daily_costs,
      monthly_costs,
      pending_debts,
      supplier_debts,
      pending_commissions,
      tickets_today: ticketsToday.length,
      tickets_month: ticketsMonth.length
    };
  })();

  const dailyRevenue = (() => {
    if (isLoading) return undefined;

    const days = selectedPeriod === 'week' ? 7 : 30;
    const result: DailyRevenue[] = [];

    const now = new Date();
    const baseTodayStart = new Date();
    if (settings?.opening_time) {
      const [hours, minutes] = settings.opening_time.split(':').map(Number);
      baseTodayStart.setHours(hours, minutes, 0, 0);
      if (now < baseTodayStart) {
        baseTodayStart.setDate(baseTodayStart.getDate() - 1);
      }
    } else {
      baseTodayStart.setHours(0, 0, 0, 0);
    }

    const tickets = ticketsData || [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(baseTodayStart);
      d.setDate(d.getDate() - i);
      const dayStart = d.getTime();
      const dayEnd = dayStart + 86400000;

      const dayTickets = tickets.filter((t: any) => {
        const time = new Date(t.completed_at || t.created_at).getTime();
        return time >= dayStart && time < dayEnd;
      });

      const completedDayTickets = dayTickets.filter((t: any) => t.status === 'completed');
      const dayRevenue = completedDayTickets.reduce((sum: number, t: any) => sum + (t.paid_amount || 0), 0);
      const dayCosts = computeCosts(completedDayTickets.map((t: any) => t.id));

      result.push({
        date: d.toISOString(),
        ticket_count: dayTickets.length,
        gross_revenue: dayRevenue,
        collected_amount: dayRevenue - dayCosts // net profit per day
      });
    }

    return result;
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-[var(--text-muted)]">
          <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="font-medium animate-pulse">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{t('navigation.finance')}</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">{t('finance.overview')}</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-4 py-2 border border-[var(--border-lg)] bg-[var(--bg-panel)] text-white rounded-lg focus:ring-2 focus:ring-primary-500 hover:border-primary-500/50 outline-none transition-colors cursor-pointer"
          >
            <option value="today">{t('finance.today')}</option>
            <option value="week">{t('finance.thisWeek')}</option>
            <option value="month">{t('finance.thisMonth')}</option>
          </select>

          <Button variant="secondary" className="shadow-sm">
            <Download className="w-4 h-4 mr-2" />
            {t('finance.export')}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('finance.dailyRevenue')}
          value={stats?.daily_revenue.toLocaleString() || '0'}
          suffix="DA"
          icon={TrendingUp}
          color="success"
          onClick={() => setActiveModal('dailyRevenue')}
        />

        <StatCard
          title="Bénéfice Quotidien"
          value={(stats?.daily_profit || 0).toLocaleString()}
          suffix="DA"
          icon={TrendingUp}
          color={stats && stats.daily_profit >= 0 ? 'success' : 'danger'}
          onClick={() => setActiveModal('dailyProfit')}
        />

        <StatCard
          title={t('finance.pendingDebts')}
          value={stats?.pending_debts.toLocaleString() || '0'}
          suffix="DA"
          icon={Users}
          color="warning"
          trendDown
          onClick={() => setActiveModal('pendingDebts')}
        />

        <StatCard
          title={t('finance.supplierDebts')}
          value={stats?.supplier_debts.toLocaleString() || '0'}
          suffix="DA"
          icon={Package}
          color="danger"
          onClick={() => setActiveModal('supplierDebts')}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-[var(--bg-surface)] border-[var(--border)] group hover:border-primary-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">{t('employee.pendingCommissions')}</p>
              <p className="text-2xl font-black text-white mt-1">
                {(stats?.pending_commissions || 0).toLocaleString()} <span className="text-lg opacity-50 font-medium">DA</span>
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-500/10 border border-primary-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6 text-primary-400" />
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-[var(--bg-surface)] border-[var(--border)] group hover:border-warning-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">Coûts du Mois</p>
              <p className="text-2xl font-black text-warning-400 mt-1">
                {(stats?.monthly_costs || 0).toLocaleString()} <span className="text-lg opacity-50 font-medium">DA</span>
              </p>
            </div>
            <div className="w-12 h-12 bg-warning-500/10 border border-warning-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingDown className="w-6 h-6 text-warning-400" />
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-[var(--bg-surface)] border-[var(--border)] group hover:border-success-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">{t('finance.netProfit')} (Mois)</p>
              <p className={`text-2xl font-black mt-1 ${stats && stats.monthly_profit >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                {(stats?.monthly_profit || 0).toLocaleString()} <span className="text-lg opacity-50 font-medium">DA</span>
              </p>
            </div>
            <div className="w-12 h-12 bg-success-500/10 border border-success-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6 text-success-400" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2">
          <Card className="h-full border-[var(--border-lg)] bg-[var(--bg-panel)] p-0 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="text-lg font-bold text-white">{t('finance.revenueTrend')}</h2>
              <p className="text-sm text-[var(--text-muted)] font-medium">{t('finance.lastDays', { days: selectedPeriod === 'week' ? 7 : 30 })}</p>
            </div>
            <div className="p-5 flex-1 min-h-[300px]">
              {dailyRevenue && dailyRevenue.length > 0 ? (
                <div className="h-full w-full">
                  <div className="flex items-end justify-between h-full gap-2">
                    {dailyRevenue.map((day, index) => {
                      const maxValue = Math.max(...dailyRevenue.map(d => d.gross_revenue));
                      const heightRev = maxValue > 0 ? (day.gross_revenue / maxValue) * 100 : 0;
                      const heightProfit = maxValue > 0 ? (Math.max(0, day.collected_amount) / maxValue) * 100 : 0;

                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-2 group relative">
                          {/* Tooltip */}
                          <div className="opacity-0 group-hover:opacity-100 absolute -top-14 bg-[var(--bg-surface)] border border-[var(--border-lg)] px-2 py-1.5 rounded text-xs font-bold text-white shadow-xl transition-opacity pointer-events-none whitespace-nowrap z-10 space-y-0.5">
                            <div className="text-success-400">💰 Rev: {day.gross_revenue.toLocaleString()} DA</div>
                            <div className={day.collected_amount >= 0 ? 'text-emerald-400' : 'text-danger-400'}>
                              📈 Bénéf: {day.collected_amount.toLocaleString()} DA
                            </div>
                          </div>
                          {/* Two bars: revenue (blue) + profit (green) */}
                          <div className="w-full flex gap-0.5 items-end">
                            <div
                              className="flex-1 bg-primary-500/70 rounded-t transition-all group-hover:bg-primary-500"
                              style={{ height: `${heightRev * 2}px`, minHeight: '4px' }}
                            />
                            <div
                              className={`flex-1 rounded-t transition-all ${day.collected_amount >= 0 ? 'bg-emerald-500/70 group-hover:bg-emerald-500' : 'bg-danger-500/70 group-hover:bg-danger-500'}`}
                              style={{ height: `${heightProfit * 2}px`, minHeight: '4px' }}
                            />
                          </div>
                          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] transform -rotate-45 origin-top-left whitespace-nowrap pt-2">
                            {new Date(day.date).toLocaleDateString(undefined, {
                              day: 'numeric',
                              month: 'short'
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-[var(--text-muted)] border-dashed border-2 border-[var(--border)] rounded-xl m-4">
                  <div className="text-center">
                    <TrendingUp className="w-8 h-8 opacity-20 mx-auto mb-2" />
                    <p className="font-medium">{t('common.noData')}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Recent Transactions Table */}
        <div className="lg:col-span-1">
          <Card className="h-full border-[var(--border-lg)] bg-[var(--bg-panel)] p-0 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[var(--border)]">
              <h2 className="text-lg font-bold text-white">{t('finance.recentTransactions')}</h2>
              <p className="text-sm text-[var(--text-muted)] font-medium">Aujourd'hui</p>
            </div>

            <div className="overflow-x-auto flex-1 scrollbar-thin scrollbar-thumb-gray">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-base)]">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      {t('finance.description')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                      {t('finance.amount')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {/* Sample rows - would be populated from database */}
                  <tr className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-4 py-4">
                      <p className="text-sm font-bold text-white">{t('finance.ticketRevenue')}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-black text-success-400">
                        +{stats?.daily_revenue.toLocaleString() || '0'} DA
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {stats?.daily_revenue === 0 && (
              <div className="p-6 text-center text-[var(--text-secondary)] font-medium text-sm">
                Aucune transaction récente.
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'dailyRevenue' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setActiveModal(null)}>
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--bg-surface)] z-10 rounded-t-xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-success-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-success-500" />
                </div>
                <h2 className="text-lg font-bold text-white">Revenu du jour détaillé</h2>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-[var(--bg-panel)] rounded-lg transition-colors text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-panel)] sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Ticket</th>
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {(() => {
                    const now = new Date();
                    const modalTodayStart = new Date();
                    if (settings?.opening_time) {
                      const [hours, minutes] = settings.opening_time.split(':').map(Number);
                      modalTodayStart.setHours(hours, minutes, 0, 0);
                      if (now < modalTodayStart) {
                        modalTodayStart.setDate(modalTodayStart.getDate() - 1);
                      }
                    } else {
                      modalTodayStart.setHours(0, 0, 0, 0);
                    }
                    const todayTickets = (ticketsData || []).filter((t: any) => t.status === 'completed' && new Date(t.completed_at || t.created_at) >= modalTodayStart);
                    if (todayTickets.length === 0) return <tr><td colSpan={2} className="p-4 text-center text-sm text-[var(--text-muted)]">Aucun revenu aujourd'hui</td></tr>;
                    return todayTickets.map((t: any) => (
                      <tr key={t.id} className="hover:bg-[var(--bg-hover)]">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-white">Ticket {t.ticket_number ? `#${t.ticket_number}` : `#${t.id.split('-')[0]}`}</p>
                          <p className="text-xs text-[var(--text-muted)]">{new Date(t.completed_at || t.created_at).toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td className="px-4 py-3 text-success-400 font-bold">{t.paid_amount?.toLocaleString()} DA</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'pendingDebts' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setActiveModal(null)}>
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--bg-surface)] z-10 rounded-t-xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-warning-500/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-warning-500" />
                </div>
                <h2 className="text-lg font-bold text-white">Dettes Clients</h2>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-[var(--bg-panel)] rounded-lg transition-colors text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-panel)] sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Client</th>
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Montant restant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {(() => {
                    const pendingDebts = (debtsData || []).filter((d: any) => d.status !== 'completed' && d.status !== 'cancelled' && d.remaining_amount > 0);
                    if (pendingDebts.length === 0) return <tr><td colSpan={2} className="p-4 text-center text-sm text-[var(--text-muted)]">Aucune dette client</td></tr>;
                    return pendingDebts.map((d: any) => (
                      <tr key={d.id} className="hover:bg-[var(--bg-hover)]">
                        <td className="px-4 py-3 font-semibold text-white">Client ou Ticket #{d.ticket_id?.split('-')[0] || 'Inconnu'}</td>
                        <td className="px-4 py-3 text-warning-400 font-bold">{d.remaining_amount?.toLocaleString()} DA</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'supplierDebts' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setActiveModal(null)}>
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--bg-surface)] z-10 rounded-t-xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-danger-500/10 flex items-center justify-center">
                  <Package className="w-4 h-4 text-danger-500" />
                </div>
                <h2 className="text-lg font-bold text-white">Dettes Fournisseurs</h2>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-[var(--bg-panel)] rounded-lg transition-colors text-[var(--text-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-panel)] sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Fournisseur</th>
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Montant dû</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {(() => {
                    const supplierDebts = (suppliersData || []).filter((s: any) => s.balance_owed > 0);
                    if (supplierDebts.length === 0) return <tr><td colSpan={2} className="p-4 text-center text-sm text-[var(--text-muted)]">Aucune dette fournisseur</td></tr>;
                    return supplierDebts.map((s: any) => (
                      <tr key={s.id} className="hover:bg-[var(--bg-hover)]">
                        <td className="px-4 py-3 font-semibold text-white">{s.company_name || s.name || 'Fournisseur Inconnu'}</td>
                        <td className="px-4 py-3 text-danger-400 font-bold">{s.balance_owed?.toLocaleString()} DA</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div >
  );
}

interface StatCardProps {
  title: string;
  value: string;
  suffix?: string;
  icon: React.ElementType;
  color: 'primary' | 'success' | 'warning' | 'danger';
  trend?: string;
  trendDown?: boolean;
  onClick?: () => void;
}

function StatCard({ title, value, suffix, icon: Icon, color, trend, trendDown, onClick }: StatCardProps) {
  const colorClasses = {
    primary: 'bg-primary-500/10 text-primary-400 border-primary-500/20 shadow-[var(--shadow-glow-orange)]',
    success: 'bg-success-500/10 text-success-400 border-success-500/20 shadow-[var(--shadow-glow-green)]',
    warning: 'bg-warning-500/10 text-warning-400 border-warning-500/20',
    danger: 'bg-danger-500/10 text-danger-400 border-danger-500/20',
  };

  const iconColors = {
    primary: 'text-primary-400',
    success: 'text-success-400',
    warning: 'text-warning-400',
    danger: 'text-danger-400'
  }

  return (
    <Card
      className={`p-5 bg-[var(--bg-panel)] border ${colorClasses[color]} bg-gradient-to-br from-transparent to-[var(--bg-base)] group hover:scale-[1.02] transition-transform duration-300 ${onClick ? 'cursor-pointer hover:shadow-lg' : ''}`}
      onClick={onClick}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">{title}</p>
            <p className="text-3xl font-black text-white">
              {value} <span className="text-sm font-bold text-[var(--text-muted)] opacity-70 ml-1">{suffix}</span>
            </p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--bg-base)] border border-[var(--border)] group-hover:rotate-12 transition-transform`}>
            <Icon className={`w-5 h-5 ${iconColors[color]}`} />
          </div>
        </div>

        {trend && (
          <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded w-fit ${trendDown ? 'bg-danger-500/10 text-danger-400' : 'bg-success-500/10 text-success-400'}`}>
            {trendDown ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
            <span>{trend} vs Hier</span>
          </div>
        )}
      </div>
    </Card>
  );
}
