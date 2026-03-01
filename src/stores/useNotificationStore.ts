import { create } from 'zustand';

export interface Notification {
    id: string;
    type: 'ticket_new' | 'system' | 'alert';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    metadata?: {
        ticket_id?: string;
        ticket_number?: string;
    };
}

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (notification: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
    markAsRead: () => void;
    removeNotification: (id: string) => void;
    clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],
    unreadCount: 0,

    addNotification: (notification) => {
        const newNotification: Notification = {
            ...notification,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            read: false,
        };

        set((state) => ({
            notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep last 50
            unreadCount: state.unreadCount + 1,
        }));
    },

    markAsRead: () => {
        set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, read: true })),
            unreadCount: 0,
        }));
    },

    removeNotification: (id) => {
        set((state) => {
            const notification = state.notifications.find((n) => n.id === id);
            const newUnreadCount = notification && !notification.read ? state.unreadCount - 1 : state.unreadCount;
            return {
                notifications: state.notifications.filter((n) => n.id !== id),
                unreadCount: Math.max(0, newUnreadCount),
            };
        });
    },

    clear: () => {
        set({ notifications: [], unreadCount: 0 });
    },
}));
