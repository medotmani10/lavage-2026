import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  Calendar,
  Download
} from 'lucide-react';


interface DailyRevenue {
  date: string;
  ticket_count: number;
  gross_revenue: number;
  collected_amount: number;
}

export function Finance() {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('week');

  const stats = useLiveQuery(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const tickets = await db.queue_tickets.toArray();
    const completedTickets = tickets.filter(t => t.status === 'completed');

    // Bug #8 fix: filter by completed_at (with fallback) for accurate daily/monthly reporting
    const getTicketDate = (t: any) => new Date(t.completed_at || t.updated_at || t.created_at).getTime();

    const ticketsToday = completedTickets.filter(t => getTicketDate(t) >= today.getTime());
    const ticketsMonth = completedTickets.filter(t => getTicketDate(t) >= firstDayOfMonth.getTime());

    // Bug #1 fix: use paid_amount (actual cash) not total_amount (includes unpaid credit)
    const daily_revenue = ticketsToday.reduce((sum, t) => sum + (t.paid_amount || 0), 0);
    const monthly_revenue = ticketsMonth.reduce((sum, t) => sum + (t.paid_amount || 0), 0);
    const total_revenue = completedTickets.reduce((sum, t) => sum + (t.paid_amount || 0), 0);

    const debts = await db.debts.toArray();
    const pending_debts = debts
      .filter(d => d.status !== 'completed' && d.status !== 'cancelled')
      .reduce((sum, d) => sum + (d.remaining_amount || 0), 0);

    const suppliers = await db.suppliers.toArray();
    const supplier_debts = suppliers.reduce((sum, s: any) => sum + (s.balance_owed || 0), 0);

    const employees = await db.employees.toArray();
    const employee_commissions = employees
      .filter(e => (e as any).active !== false)
      .reduce((sum, e) => sum + (e.pending_commissions || 0), 0);

    return {
      daily_revenue,
      monthly_revenue,
      total_revenue,
      pending_debts,
      supplier_debts,
      employee_commissions,
      tickets_today: ticketsToday.length,
      tickets_month: ticketsMonth.length
    };
  });

  const dailyRevenue = useLiveQuery(async () => {
    const days = selectedPeriod === 'week' ? 7 : 30;
    const result: DailyRevenue[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tickets = await db.queue_tickets.toArray();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayStart = d.getTime();
      const dayEnd = dayStart + 86400000;

      const dayTickets = tickets.filter(t => {
        const time = new Date(t.completed_at || t.created_at).getTime();
        return time >= dayStart && time < dayEnd;
      });

      const completedDayTickets = dayTickets.filter(t => t.status === 'completed');

      result.push({
        date: d.toISOString(),
        ticket_count: dayTickets.length,
        gross_revenue: completedDayTickets.reduce((sum, t) => sum + (t.paid_amount || 0), 0),
        // Bug #1 fix: collected = paid_amount only
        collected_amount: completedDayTickets.reduce((sum, t) => sum + (t.paid_amount || 0), 0)
      });
    }

    return result;
  }, [selectedPeriod]);

  const isLoading = stats === undefined || dailyRevenue === undefined;

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
          trend="+12%"
        />

        <StatCard
          title={t('finance.ticketsCompleted')}
          value={stats?.tickets_today.toString() || '0'}
          suffix={t('finance.tickets')}
          icon={Calendar}
          color="primary"
        />

        <StatCard
          title={t('finance.pendingDebts')}
          value={stats?.pending_debts.toLocaleString() || '0'}
          suffix="DA"
          icon={Users}
          color="warning"
          trend="-5%"
          trendDown
        />

        <StatCard
          title={t('finance.supplierDebts')}
          value={stats?.supplier_debts.toLocaleString() || '0'}
          suffix="DA"
          icon={Package}
          color="danger"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-[var(--bg-surface)] border-[var(--border)] group hover:border-primary-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">{t('employee.pendingCommissions')}</p>
              <p className="text-2xl font-black text-white mt-1">
                {stats?.employee_commissions.toLocaleString() || '0'} <span className="text-lg opacity-50 font-medium">DA</span>
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-500/10 border border-primary-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6 text-primary-400" />
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-[var(--bg-surface)] border-[var(--border)] group hover:border-success-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider">{t('finance.netProfit')}</p>
              <p className="text-2xl font-black text-success-400 mt-1">
                {stats ? ((stats.daily_revenue - stats.employee_commissions) || 0).toLocaleString() : '0'} <span className="text-lg opacity-50 font-medium">DA</span>
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
                      const height = maxValue > 0 ? (day.gross_revenue / maxValue) * 100 : 0;

                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-2 group relative">
                          {/* Tooltip */}
                          <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-[var(--bg-surface)] border border-[var(--border-lg)] px-2 py-1 rounded text-xs font-bold text-white shadow-xl transition-opacity pointer-events-none whitespace-nowrap z-10">
                            {day.gross_revenue.toLocaleString()} DA
                          </div>
                          <div
                            className="w-full bg-primary-500/80 rounded-t transition-all group-hover:bg-primary-500 cursor-pointer"
                            style={{ height: `${height}%`, minHeight: '4px' }}
                          />
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
}

function StatCard({ title, value, suffix, icon: Icon, color, trend, trendDown }: StatCardProps) {
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
    <Card className={`p-5 bg-[var(--bg-panel)] border ${colorClasses[color]} bg-gradient-to-br from-transparent to-[var(--bg-base)] group hover:scale-[1.02] transition-transform duration-300`}>
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
