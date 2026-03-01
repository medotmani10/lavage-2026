import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/useAuthStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNotificationStore } from '../stores/useNotificationStore';
import { NotificationDropdown } from './NotificationDropdown';
import { playNotificationChime } from '../lib/audio';
import { useEffect, useRef } from 'react';

const pageTitles: Record<string, string> = {
  '/dashboard': 'navigation.dashboard',
  '/queue': 'navigation.queue',
  '/pos': 'navigation.pos',
  '/customers': 'navigation.customers',
  '/inventory': 'navigation.inventory',
  '/suppliers': 'navigation.suppliers',
  '/employees': 'navigation.employees',
  '/finance': 'navigation.finance',
  '/reports': 'navigation.reports',
  '/settings': 'navigation.settings',
};

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotificationStore();
  const lastUnreadRef = useRef(unreadCount);

  // Play sound when unreadCount increases
  useEffect(() => {
    if (unreadCount > lastUnreadRef.current) {
      playNotificationChime();
    }
    lastUnreadRef.current = unreadCount;
  }, [unreadCount]);

  const pageKey = pageTitles[location.pathname] || 'navigation.dashboard';

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
    <header className="fixed top-0 right-0 no-print flex items-center justify-between px-4 md:px-6 bg-[rgba(10,25,41,0.85)] saturate-[150%] backdrop-blur-xl border-b border-[var(--border)] z-30 h-[var(--header-h)] left-0 md:left-[var(--sidebar-w)]">
      {/* Left: Page Title & Mobile Menu */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-2 text-[var(--text-secondary)] hover:text-white rounded-lg transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
        )}
        <div>
          <h2 className="text-lg font-bold text-white">
            {t(pageKey)}
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {new Date().toLocaleDateString('fr-DZ', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex flex-row items-center gap-2">
        {/* Notification dropdown */}
        <NotificationDropdown />

        {/* Divider */}
        <div className="w-px h-8 mx-2 bg-[var(--border)]"></div>

        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br from-primary-500 to-primary-600 shadow-[var(--shadow-glow-orange)]">
            {user?.full_name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-white leading-tight">{user?.full_name}</p>
            <p className="text-xs text-[var(--text-muted)] capitalize mt-0.5">{user?.role}</p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="ml-2 p-2.5 rounded-xl transition-all duration-200 border border-[var(--border)] hover:bg-danger-500/15"
          title="Déconnexion"
        >
          <LogOut className="w-4 h-4 text-danger-400" />
        </button>
      </div>
    </header>
  );
}
