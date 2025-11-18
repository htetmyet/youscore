import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { User, SubscriptionPlan, SubscriptionStatus } from '../types';
import { api } from '../services/mockApi';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<User>;
    logout: () => void;
    register: (email: string, password: string) => Promise<User>;
    updateUserSubscription: (userId: string, plan: SubscriptionPlan, paymentScreenshot: string) => Promise<User | null>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            setUser(null);
            return;
        }
        try {
            const parsedUser: User = JSON.parse(storedUser);
            const freshUser = await api.fetchUser(parsedUser.id);
            setUser(freshUser);
            localStorage.setItem('user', JSON.stringify(freshUser));
        } catch (error) {
            console.error('Failed to refresh user', error);
            setUser(null);
            localStorage.removeItem('user');
        }
    }, []);

    useEffect(() => {
        const bootstrap = async () => {
            await refreshUser();
            setLoading(false);
        };
        bootstrap();
    }, [refreshUser]);


    const login = async (email: string, password: string): Promise<User> => {
        setLoading(true);
        try {
            const result = await api.login(email, password);
            if (result.error) {
                throw new Error(result.error);
            }
            if (result.user) {
                localStorage.setItem('user', JSON.stringify(result.user));
                setUser(result.user);
                return result.user;
            }
            throw new Error('An unknown login error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const register = async (email: string, password: string): Promise<User> => {
        setLoading(true);
        try {
            const result = await api.register(email, password);
            if (result.error) {
                throw new Error(result.error);
            }
            if (result.user) {
                return result.user;
            }
            throw new Error('An unknown registration error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        if (user) {
            api.logout(user.id).catch(() => {});
        }
        setUser(null);
        localStorage.removeItem('user');
    };

    const updateUserSubscription = async (userId: string, plan: SubscriptionPlan, paymentScreenshot: string) => {
        const updatedUser = await api.requestSubscription(userId, plan, paymentScreenshot);
        if (updatedUser) {
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        return updatedUser;
    }

    const changePassword = async (currentPassword: string, newPassword: string) => {
        if (!user) {
            return { success: false, message: "No user logged in." };
        }
        const result = await api.changePassword(user.id, newPassword, currentPassword);
        if (result.success) {
            await refreshUser();
        }
        return result;
    };

    // Fix: Replaced JSX with React.createElement to be compatible with a .ts file extension.
    // The TypeScript compiler was misinterpreting JSX syntax as language operators, causing multiple parsing errors.
    return React.createElement(AuthContext.Provider, { value: { user, loading, login, logout, register, updateUserSubscription, refreshUser, changePassword } }, children);
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
