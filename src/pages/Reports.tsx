import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { showAlert } from '../stores/useDialogStore';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { FileText, Download, BarChart2, PieChart as PieChartIcon, Activity, TrendingUp, Package, Users } from 'lucide-react';
import { db } from '../lib/db';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, format, parseISO, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

export function Reports() {
    const { t } = useTranslation();
    const [period, setPeriod] = useState('month');
    const [reportType, setReportType] = useState('revenue');
    const [isLoading, setIsLoading] = useState(false);

    // Data states
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [servicesData, setServicesData] = useState<any[]>([]);
    const [employeesData, setEmployeesData] = useState<any[]>([]);
    const [inventoryData, setInventoryData] = useState<any[]>([]);

    // Summary states
    const [summary, setSummary] = useState({
        totalRevenue: 0,
        totalTickets: 0,
        topService: '-',
        avgTicketValue: 0
    });

    useEffect(() => {
        fetchReportData();
    }, [period, reportType]);

    const fetchReportData = async () => {
        setIsLoading(true);
        try {
            const now = new Date();
            let startDate = startOfDay(now);
            const endDate = endOfDay(now);

            switch (period) {
                case 'today': startDate = startOfDay(now); break;
                case 'week': startDate = startOfWeek(now, { weekStartsOn: 1 }); break;
                case 'month': startDate = startOfMonth(now); break;
                case 'year': startDate = startOfYear(now); break;
                // Add 30 days as default if needed
                default: startDate = subDays(now, 30);
            }

            if (reportType === 'revenue') {
                await fetchRevenueData(startDate, endDate);
            } else if (reportType === 'services') {
                await fetchServicesData(startDate, endDate);
            } else if (reportType === 'employees') {
                await fetchEmployeesData(startDate, endDate);
            } else if (reportType === 'inventory') {
                await fetchInventoryData();
            }

        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRevenueData = async (startDate: Date, endDate: Date) => {
        const tickets = await db.queue_tickets
            .filter(t => {
                if (t.status !== 'completed') return false;
                const completedDate = t.completed_at ? new Date(t.completed_at) : new Date(t.created_at);
                return completedDate >= startDate && completedDate <= endDate;
            })
            .toArray();

        let totalRev = 0;
        const groupedByDate: Record<string, number> = {};

        tickets?.forEach(ticket => {
            const completedDate = ticket.completed_at ? parseISO(ticket.completed_at) : parseISO(ticket.created_at);
            const dateStr = format(completedDate, period === 'today' ? 'HH:mm' : 'dd MMM', { locale: fr });
            totalRev += Number(ticket.paid_amount) || 0;
            groupedByDate[dateStr] = (groupedByDate[dateStr] || 0) + (Number(ticket.paid_amount) || 0);
        });

        const chartData = Object.keys(groupedByDate).map(date => ({
            name: date,
            Revenus: groupedByDate[date]
        }));

        setRevenueData(chartData);
        setSummary(prev => ({
            ...prev,
            totalRevenue: totalRev,
            totalTickets: tickets?.length || 0,
            avgTicketValue: tickets?.length ? totalRev / tickets.length : 0
        }));
    };

    const fetchServicesData = async (startDate: Date, endDate: Date) => {
        const tickets = await db.queue_tickets
            .filter(t => {
                if (t.status !== 'completed') return false;
                const completedDate = t.completed_at ? new Date(t.completed_at) : new Date(t.created_at);
                return completedDate >= startDate && completedDate <= endDate;
            })
            .toArray();

        if (tickets.length === 0) {
            setServicesData([]);
            return;
        }

        const ticketIds = tickets.map(t => t.id);

        const ticketServices = await db.ticket_services
            .where('ticket_id')
            .anyOf(ticketIds)
            .toArray();

        const serviceCounts: Record<string, number> = {};
        for (const ts of ticketServices) {
            const service = await db.services.get(ts.service_id);
            const serviceName = service?.name || 'Inconnu';
            serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + (ts.quantity || 1);
        }

        const chartData = Object.keys(serviceCounts)
            .map(name => ({ name, value: serviceCounts[name] }))
            .sort((a, b) => b.value - a.value);

        setServicesData(chartData);
        if (chartData.length > 0) {
            setSummary(prev => ({ ...prev, topService: chartData[0].name }));
        }
    };

    const fetchEmployeesData = async (startDate: Date, endDate: Date) => {
        const tickets = await db.queue_tickets
            .filter(t => {
                if (t.status !== 'completed' || !t.assigned_employee_id) return false;
                const completedDate = t.completed_at ? new Date(t.completed_at) : new Date(t.created_at);
                return completedDate >= startDate && completedDate <= endDate;
            })
            .toArray();

        const empStats: Record<string, { tickets: number, revenue: number }> = {};

        for (const t of tickets) {
            let empName = 'Inconnu';
            if (t.assigned_employee_id) {
                const emp = await db.employees.get(t.assigned_employee_id);
                if (emp && emp.user_id) {
                    const user = await db.users.get(emp.user_id);
                    if (user) empName = user.full_name;
                }
            }
            if (!empStats[empName]) empStats[empName] = { tickets: 0, revenue: 0 };
            empStats[empName].tickets += 1;
            empStats[empName].revenue += Number(t.paid_amount) || 0;
        }

        const chartData = Object.keys(empStats).map(name => ({
            name,
            Tickets: empStats[name].tickets,
            Revenus: empStats[name].revenue
        }));

        setEmployeesData(chartData);
    };

    const fetchInventoryData = async () => {
        const products = await db.products
            .filter(p => (p as any).active !== false)
            .toArray();

        products.sort((a, b) => a.stock_quantity - b.stock_quantity);
        const top15 = products.slice(0, 15);

        const chartData = top15.map(p => ({
            name: p.name,
            Stock: p.stock_quantity,
            Minimum: p.min_stock
        }));

        setInventoryData(chartData);
    };

    const handleExport = () => {
        showAlert("La fonction d'exportation PDF sera disponible dans la prochaine mise à jour.", 'info');
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">{t('navigation.reports')}</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Analyse et exportation des données</p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="px-4 py-2 border border-[var(--border-lg)] bg-[var(--bg-panel)] text-white rounded-lg focus:ring-2 focus:ring-primary-500 hover:border-primary-500/50 outline-none transition-colors cursor-pointer"
                    >
                        <option value="today">Aujourd'hui</option>
                        <option value="week">Cette semaine</option>
                        <option value="month">Ce mois</option>
                        <option value="year">Cette année</option>
                    </select>

                    <Button variant="primary" onClick={handleExport} className="shadow-[var(--shadow-glow-orange)]">
                        <Download className="w-4 h-4 mr-2" />
                        Exporter
                    </Button>
                </div>
            </div>

            {/* Quick Stats (Only show for Revenue/Services/Employees where date matters) */}
            {reportType !== 'inventory' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={TrendingUp} label="Revenus Total" value={`${summary.totalRevenue.toLocaleString()} DA`} color="text-success-400" />
                    <StatCard icon={FileText} label="Tickets Complétés" value={summary.totalTickets.toString()} color="text-primary-400" />
                    <StatCard icon={Activity} label="Moyenne / Ticket" value={`${summary.avgTicketValue.toFixed(0)} DA`} color="text-warning-400" />
                    <StatCard icon={PieChartIcon} label="Service Populaire" value={summary.topService} color="text-info-400" />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Navigation / Types */}
                <div className="lg:col-span-1 space-y-3">
                    <ReportNavButton
                        active={reportType === 'revenue'}
                        onClick={() => setReportType('revenue')}
                        icon={BarChart2}
                        label="Revenus et Ventes"
                    />
                    <ReportNavButton
                        active={reportType === 'services'}
                        onClick={() => setReportType('services')}
                        icon={PieChartIcon}
                        label="Performances des Services"
                    />
                    <ReportNavButton
                        active={reportType === 'employees'}
                        onClick={() => setReportType('employees')}
                        icon={Users}
                        label="Productivité des Employés"
                    />
                    <ReportNavButton
                        active={reportType === 'inventory'}
                        onClick={() => setReportType('inventory')}
                        icon={Package}
                        label="Rapport d'Inventaire"
                    />
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3">
                    <Card className="h-full min-h-[500px] border-[var(--border-lg)] bg-[var(--bg-panel)] p-6 relative">
                        {isLoading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-panel)]/50 backdrop-blur-sm z-10 rounded-2xl">
                                <div className="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin mb-4"></div>
                                <p className="text-[var(--text-secondary)] font-medium">Chargement des données...</p>
                            </div>
                        ) : null}

                        <h2 className="text-xl font-bold text-white mb-6">
                            {reportType === 'revenue' && 'Évolution des Revenus'}
                            {reportType === 'services' && 'Répartition des Services Vendus'}
                            {reportType === 'employees' && 'Tickets traités par Employé'}
                            {reportType === 'inventory' && 'État des Stocks (Articles Critiques)'}
                        </h2>

                        <div className="h-[400px] w-full">
                            {reportType === 'revenue' && revenueData.length > 0 && (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={revenueData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                        <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                                        <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff' }}
                                            itemStyle={{ color: '#F59E0B' }}
                                        />
                                        <Legend />
                                        <Line type="monotone" dataKey="Revenus" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}

                            {reportType === 'services' && servicesData.length > 0 && (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={servicesData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={150}
                                            fill="#8884d8"
                                            dataKey="value"
                                            label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                        >
                                            {servicesData.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}

                            {reportType === 'employees' && employeesData.length > 0 && (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={employeesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                        <XAxis dataKey="name" stroke="#9CA3AF" />
                                        <YAxis yAxisId="left" orientation="left" stroke="#3B82F6" />
                                        <YAxis yAxisId="right" orientation="right" stroke="#F59E0B" />
                                        <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                        <Legend />
                                        <Bar yAxisId="left" dataKey="Tickets" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                        <Bar yAxisId="right" dataKey="Revenus" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}

                            {reportType === 'inventory' && inventoryData.length > 0 && (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={inventoryData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                        <XAxis dataKey="name" stroke="#9CA3AF" angle={-45} textAnchor="end" height={80} />
                                        <YAxis stroke="#9CA3AF" />
                                        <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                        <Legend verticalAlign="top" height={36} />
                                        <Bar dataKey="Stock" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                                            {inventoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.Stock <= entry.Minimum ? '#EF4444' : '#3B82F6'} />
                                            ))}
                                        </Bar>
                                        <Bar dataKey="Minimum" fill="#6B7280" opacity={0.5} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}

                            {/* Empty States */}
                            {!isLoading && (
                                (reportType === 'revenue' && revenueData.length === 0) ||
                                (reportType === 'services' && servicesData.length === 0) ||
                                (reportType === 'employees' && employeesData.length === 0) ||
                                (reportType === 'inventory' && inventoryData.length === 0)
                            ) && (
                                    <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
                                        <BarChart2 className="w-16 h-16 mb-4 opacity-20" />
                                        <p>Aucune donnée disponible pour cette période.</p>
                                    </div>
                                )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function ReportNavButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${active
                ? 'bg-primary-500/10 border-primary-500/30 shadow-[var(--shadow-glow-orange)]'
                : 'bg-[var(--bg-panel)] border-[var(--border-lg)] hover:border-primary-500/50 hover:bg-[var(--bg-hover)]'
                }`}
        >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-primary-500 text-white' : 'bg-[var(--bg-base)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>
                <Icon className="w-5 h-5" />
            </div>
            <span className={`font-bold text-sm ${active ? 'text-primary-400' : 'text-white'}`}>{label}</span>
        </button>
    );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: string }) {
    return (
        <Card className="bg-[var(--bg-panel)] p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-[var(--bg-base)] flex items-center justify-center ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-xs text-[var(--text-secondary)] font-medium uppercase tracking-wider">{label}</p>
                <p className="text-xl font-bold text-white mt-1">{value}</p>
            </div>
        </Card>
    );
}
