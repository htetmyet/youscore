import { AppSettings, Notification, Prediction, PredictionResult, SubscriptionPlan, User, WeeklyStat } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8090/api';

class ApiError extends Error {
    status: number;
    code?: string;

    constructor(status: number, code: string | undefined, message: string) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

class ApiClient {
    private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            credentials: 'include',
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
        });

        let payload: any = undefined;
        if (response.status !== 204) {
            const text = await response.text();
            if (text) {
                try {
                    payload = JSON.parse(text);
                } catch (_) {
                    payload = text;
                }
            }
        }

        if (!response.ok) {
            const code = typeof payload === 'object' && payload?.code ? payload.code : undefined;
            const message = typeof payload === 'object' && payload?.message
                ? payload.message
                : typeof payload === 'string'
                    ? payload
                    : response.statusText;
            throw new ApiError(response.status, code, message);
        }

        return payload as T;
    }

    async login(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
        try {
            const data = await this.request<{ user: User }>(`/auth/login`, {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
            return { user: data.user, error: null };
        } catch (error) {
            if (error instanceof ApiError && error.code) {
                if (error.code === 'invalid_credentials' || error.code === 'device_limit_reached') {
                    return { user: null, error: error.code };
                }
            }
            throw error;
        }
    }

    async logout(userId: string): Promise<void> {
        await this.request(`/auth/logout`, {
            method: 'POST',
            body: JSON.stringify({ userId }),
        });
    }

    async register(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
        try {
            const data = await this.request<{ user: User }>(`/auth/register`, {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
            return { user: data.user, error: null };
        } catch (error) {
            if (error instanceof ApiError && error.code === 'email_in_use') {
                return { user: null, error: 'email_in_use' };
            }
            throw error;
        }
    }

    async fetchUser(userId: string): Promise<User> {
        const data = await this.request<{ user: User }>(`/users/${userId}`, { method: 'GET' });
        return data.user;
    }

    async fetchAllUsers(): Promise<User[]> {
        const data = await this.request<{ users: User[] }>(`/users`, { method: 'GET' });
        return data.users;
    }

    async updateUser(userId: string, payload: Partial<User>): Promise<User | null> {
        const data = await this.request<{ user: User }>(`/users/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        return data.user;
    }

    async deleteUser(userId: string): Promise<boolean> {
        await this.request<void>(`/users/${userId}`, { method: 'DELETE' });
        return true;
    }

    async requestSubscription(userId: string, plan: SubscriptionPlan, paymentScreenshot: string): Promise<User | null> {
        const data = await this.request<{ user: User }>(`/users/${userId}/subscription/request`, {
            method: 'POST',
            body: JSON.stringify({ plan, paymentScreenshot }),
        });
        return data.user;
    }

    async approveSubscription(userId: string): Promise<User | null> {
        const data = await this.request<{ user: User }>(`/users/${userId}/subscription/approve`, { method: 'POST' });
        return data.user;
    }

    async resetSubscription(userId: string): Promise<User | null> {
        const data = await this.request<{ user: User }>(`/users/${userId}/subscription/reset`, { method: 'POST' });
        return data.user;
    }

    async changePassword(userId: string, newPassword: string, currentPassword?: string): Promise<{ success: boolean; message: string }> {
        return this.request(`/users/${userId}/password`, {
            method: 'POST',
            body: JSON.stringify({ newPassword, currentPassword }),
        });
    }

    async fetchSettings(): Promise<AppSettings> {
        const data = await this.request<{ settings: AppSettings }>(`/settings`, { method: 'GET' });
        return data.settings;
    }

    async updateSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
        const data = await this.request<{ settings: AppSettings }>(`/settings`, {
            method: 'PUT',
            body: JSON.stringify(newSettings),
        });
        return data.settings;
    }

    async addPredictions(predictionsToAdd: Omit<Prediction, 'id'>[]): Promise<void> {
        await this.request(`/predictions`, {
            method: 'POST',
            body: JSON.stringify({ predictions: predictionsToAdd }),
        });
    }

    async fetchPredictions(status: 'pending' | 'history'): Promise<Prediction[]> {
        const data = await this.request<{ predictions: Prediction[] }>(`/predictions?status=${status}`, { method: 'GET' });
        return data.predictions;
    }

    async updatePredictionResult(predictionId: string, result: PredictionResult, finalScore?: string): Promise<Prediction | null> {
        const data = await this.request<{ prediction: Prediction }>(`/predictions/${predictionId}/result`, {
            method: 'PATCH',
            body: JSON.stringify({ result, finalScore }),
        });
        return data.prediction;
    }

    async deletePrediction(predictionId: string): Promise<boolean> {
        await this.request<void>(`/predictions/${predictionId}`, { method: 'DELETE' });
        return true;
    }

    async fetchWeeklyStats(): Promise<WeeklyStat[]> {
        const data = await this.request<{ stats: WeeklyStat[] }>(`/stats/weekly`, { method: 'GET' });
        return data.stats;
    }

    async fetchAndCheckNotifications(userId: string): Promise<Notification[]> {
        const data = await this.request<{ notifications: Notification[] }>(`/notifications?userId=${userId}`, { method: 'GET' });
        return data.notifications;
    }

    async markNotificationAsRead(notificationId: string): Promise<Notification | null> {
        const data = await this.request<{ notification: Notification }>(`/notifications/${notificationId}/read`, { method: 'POST' });
        return data.notification;
    }

    async markAllNotificationsAsRead(userId: string): Promise<Notification[]> {
        const data = await this.request<{ notifications: Notification[] }>(`/notifications/mark-all`, {
            method: 'POST',
            body: JSON.stringify({ userId }),
        });
        return data.notifications;
    }
}

export const api = new ApiClient();
