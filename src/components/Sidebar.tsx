import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/useAuthStore';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard,
  Users,
  Package,
  Truck,
  UserCog,
  DollarSign,
  FileText,
  Settings,
  Ticket,
  ShoppingCart,
  LogOut,
  Wrench,
  X,
} from 'lucide-react';
import type { UserRole } from '../types';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  pageKey: string;
  minRole?: UserRole[];
  badge?: string;
}

const navigation: NavItem[] = [
  { name: 'dashboard', href: '/dashboard', icon: LayoutDashboard, pageKey: 'dashboard' },
  { name: 'queue', href: '/queue', icon: Ticket, pageKey: 'queue' },
  { name: 'pos', href: '/pos', icon: ShoppingCart, pageKey: 'pos' },
  { name: 'customers', href: '/customers', icon: Users, pageKey: 'customers' },
  { name: 'services', href: '/services', icon: Wrench, pageKey: 'services' },
  { name: 'inventory', href: '/inventory', icon: Package, pageKey: 'inventory' },
  { name: 'suppliers', href: '/suppliers', icon: Truck, pageKey: 'suppliers' },
  { name: 'employees', href: '/employees', icon: UserCog, pageKey: 'employees' },
  { name: 'finance', href: '/finance', icon: DollarSign, pageKey: 'finance', minRole: ['manager', 'admin'] },
  { name: 'reports', href: '/reports', icon: FileText, pageKey: 'reports', minRole: ['manager', 'admin'] },
  { name: 'settings', href: '/settings', icon: Settings, pageKey: 'settings', minRole: ['admin'] },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { user, hasRole, logout } = useAuthStore();
  const navigate = useNavigate();

  const filteredNavigation = navigation.filter((item) => {
    // Role-based filter (e.g., minRole: ['admin'])
    if (item.minRole && !hasRole(item.minRole)) return false;

    // Page-access filter (admin always sees everything)
    if (user?.role !== 'admin' && user?.allowed_pages) {
      return user.allowed_pages.includes(item.pageKey);
    }

    return true;
  });

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Logout error (offline?)', e);
    }
    logout();
    navigate('/login');
  };

  return (
    <aside className={`
      fixed inset-y-0 left-0 flex flex-col no-print bg-[var(--bg-base)] border-r border-[var(--border)] z-50 w-[var(--sidebar-w)]
      transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
      {/* ── Logo ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-xl w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 shadow-[var(--shadow-glow-orange)]">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">Lavage & Vidange</h1>
            <p className="text-xs font-medium text-[var(--text-muted)]">ERP 2026</p>
          </div>
        </div>

        {/* Mobile Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-2 text-[var(--text-muted)] hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 scrollbar-thin scrollbar-thumb-gray-700">
        {filteredNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            onClick={() => {
              if (onClose) onClose();
            }}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative
              ${isActive
                ? 'bg-primary-500/10 text-primary-500 font-semibold before:absolute before:left-0 before:top-[20%] before:bottom-[20%] before:w-1 before:bg-primary-500 before:rounded-r-md'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-white'}`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{t(`navigation.${item.name}`)}</span>
            {item.badge && (
              <span className="text-[10px] font-bold bg-primary-500 text-white rounded-full px-1.5 py-0.5">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── User Footer ── */}
      {
        user && (
          <div className="p-3 border-t border-[var(--border)]">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--bg-panel)] transition-all duration-200 group relative">
              {/* Avatar */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br from-primary-500 to-primary-600">
                {user.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pr-6">
                <p className="text-sm font-semibold text-white truncate">{user.full_name}</p>
                <p className="text-[10px] font-semibold text-[var(--text-muted)] mt-0.5 capitalize px-1.5 py-0.5 rounded-md bg-[var(--bg-hover)] inline-block">
                  {t(`role.${user.role}`)}
                </p>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="absolute right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-danger-500/20"
                title="Déconnexion"
              >
                <LogOut className="w-4 h-4 text-danger-400" />
              </button>
            </div>
          </div>
        )
      }
    </aside>
  );
}
