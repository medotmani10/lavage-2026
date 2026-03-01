import { useState, useRef, useEffect } from 'react';
import { Bell, X, Calendar, Ticket as TicketIcon } from 'lucide-react';
import { useNotificationStore } from '../stores/useNotificationStore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function NotificationDropdown() {
    const { notifications, unreadCount, markAsRead, removeNotification, clear } = useNotificationStore();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            // Small delay to let user see the badge before it disappears?
            // Or mark as read when opening.
            // markAsRead();
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleOpen}
                className={`relative p-2.5 rounded-xl transition-all duration-300 group ${isOpen ? 'bg-[var(--bg-hover)] border-[var(--orange)] shadow-[var(--shadow-glow-orange)]' : 'bg-[var(--bg-panel)] border-[var(--border)] hover:bg-[var(--bg-hover)]'
                    } border`}
            >
                <Bell className={`w-4 h-4 transition-colors duration-300 ${isOpen ? 'text-[var(--orange)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-500 shadow-[var(--shadow-glow-orange)]"></span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-[var(--bg-surface)] border border-[var(--border-lg)] rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in backdrop-blur-xl saturate-[120%]">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-[rgba(10,25,41,0.5)]">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white tracking-tight">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="bg-primary-500/10 text-primary-500 text-[10px] font-black px-2 py-0.5 rounded-full border border-primary-500/20">
                                    {unreadCount} NOUVELLES
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {notifications.length > 0 && (
                                <button
                                    onClick={() => markAsRead()}
                                    className="text-[10px] font-bold text-[var(--text-muted)] hover:text-primary-500 uppercase tracking-widest transition-colors"
                                >
                                    Tout marquer lu
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? (
                            <div className="divide-y divide-[var(--border)]/50">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        className={`relative p-4 transition-all duration-200 hover:bg-[rgba(255,255,255,0.02)] group cursor-default ${!notif.read ? 'bg-primary-500/[0.02]' : ''}`}
                                    >
                                        {!notif.read && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 shadow-[2px_0_10px_rgba(249,115,22,0.5)]"></div>
                                        )}

                                        <div className="flex gap-4">
                                            <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 ${notif.type === 'ticket_new'
                                                ? 'bg-primary-500/10 border-primary-500/20 group-hover:bg-primary-500/20 shadow-inner'
                                                : 'bg-dark-500/10 border-dark-500/20'
                                                }`}>
                                                {notif.type === 'ticket_new' ? <TicketIcon className="w-5 h-5 text-primary-500" /> : <Bell className="w-5 h-5 text-dark-500" />}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <p className={`text-sm tracking-tight ${!notif.read ? 'font-bold text-white' : 'font-medium text-[var(--text-primary)] opacity-80'}`}>
                                                        {notif.title}
                                                    </p>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeNotification(notif.id); }}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-danger-500/10 text-[var(--text-muted)] hover:text-danger-400"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-2">
                                                    {notif.message}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-3 h-3 text-[var(--text-muted)]" />
                                                    <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                                        {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true, locale: fr })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 px-8 text-center flex flex-col items-center">
                                <div className="w-16 h-16 bg-[var(--bg-panel)] rounded-full flex items-center justify-center mb-4 border border-[var(--border)]">
                                    <Bell className="w-8 h-8 text-[var(--text-muted)] opacity-20" />
                                </div>
                                <h4 className="text-sm font-bold text-white mb-1">Aucune notification</h4>
                                <p className="text-xs text-[var(--text-muted)]">Les alertes et nouveaux tickets apparaîtront ici.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 bg-[rgba(10,25,41,0.3)] border-t border-[var(--border)]">
                            <button
                                onClick={() => clear()}
                                className="w-full py-2.5 rounded-xl text-xs font-bold text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-hover)] transition-all flex items-center justify-center gap-2"
                            >
                                Tout effacer
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
