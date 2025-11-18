import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { Notification } from '../types';
import { api } from '../services/mockApi';
import { useAuth } from './useAuth';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    fetchNotifications: () => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        if (!user) {
            setNotifications([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const data = await api.fetchAndCheckNotifications(user.id);
            setNotifications(data);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const unreadCount = useMemo(() => {
        return notifications.filter(n => !n.isRead).length;
    }, [notifications]);

    const markAsRead = async (notificationId: string) => {
        const originalNotifications = [...notifications];
        // Optimistically update UI
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
        
        try {
            await api.markNotificationAsRead(notificationId);
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
            // Revert on error
            setNotifications(originalNotifications);
        }
    };

    const markAllAsRead = async () => {
        if (unreadCount === 0) return;
        
        const originalNotifications = [...notifications];
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

        try {
            if (user) {
                const updated = await api.markAllNotificationsAsRead(user.id);
                 setNotifications(updated);
            }
        } catch (error) {
            console.error("Failed to mark all as read:", error);
            setNotifications(originalNotifications);
        }
    };
    
    // Fix: Replaced JSX with React.createElement to be compatible with a .ts file extension.
    return React.createElement(NotificationContext.Provider, { value: { notifications, unreadCount, loading, fetchNotifications, markAsRead, markAllAsRead } }, children);
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
