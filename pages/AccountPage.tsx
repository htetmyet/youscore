import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../App';
import { SpinnerIcon } from '../components/icons';
import { SubscriptionPlan, SubscriptionStatus } from '../types';

const AccountPage: React.FC = () => {
    const { user, changePassword, changeEmail } = useAuth();
    const { t } = useLanguage();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const [newEmail, setNewEmail] = useState('');
    const [emailPassword, setEmailPassword] = useState('');
    const [emailError, setEmailError] = useState('');
    const [emailSuccess, setEmailSuccess] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setNewEmail(user.email);
        }
    }, [user]);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmNewPassword) {
            setError(t('account_password_change_error_match'));
            return;
        }
        if (!currentPassword || !newPassword) {
            setError(t('register_error_generic')); // A generic error for empty fields
            return;
        }

        setLoading(true);
        try {
            const result = await changePassword(currentPassword, newPassword);
            if (result.success) {
                setSuccess(t('account_password_change_success'));
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
            } else {
                if (result.message.includes('incorrect')) {
                    setError(t('account_password_change_error_current'));
                } else {
                    setError(t('account_password_change_error_generic'));
                }
            }
        } catch (err) {
            setError(t('account_password_change_error_generic'));
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailError('');
        setEmailSuccess('');
        if (!newEmail.trim()) {
            setEmailError(t('account_email_change_error_required'));
            return;
        }
        if (!emailPassword.trim()) {
            setEmailError(t('account_email_change_error_password'));
            return;
        }
        setEmailLoading(true);
        try {
            const response = await changeEmail(newEmail.trim(), emailPassword);
            if (response.success) {
                setEmailSuccess(t('account_email_change_success'));
                setEmailPassword('');
            } else {
                if (response.message === 'email_in_use') {
                    setEmailError(t('account_email_change_error_in_use'));
                } else if (response.message === 'invalid_password') {
                    setEmailError(t('account_email_change_error_password'));
                } else {
                    setEmailError(t('account_password_change_error_generic'));
                }
            }
        } catch (_) {
            setEmailError(t('account_password_change_error_generic'));
        } finally {
            setEmailLoading(false);
        }
    };

    if (!user) return null;

    const inputClasses = "appearance-none relative block w-full px-3 py-3 bg-surface-light border border-gray-300 placeholder-text-dark text-text-DEFAULT focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";

    const getStatusBadgeClasses = (status: SubscriptionStatus) => {
        switch (status) {
            case SubscriptionStatus.ACTIVE: return 'bg-green-100 text-green-800';
            case SubscriptionStatus.PENDING: return 'bg-yellow-100 text-yellow-800';
            case SubscriptionStatus.EXPIRED: return 'bg-red-100 text-red-800';
            case SubscriptionStatus.INACTIVE: return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    
    const translateStatus = (status: SubscriptionStatus) => {
        const key = `status_${status}` as any;
        return t(key, { 'defaultValue': status });
    };

    const translatePlan = (plan: SubscriptionPlan) => {
        if (plan === SubscriptionPlan.NONE) return t('plan_none');
        const key = `plan_${plan}` as any;
        return t(key, { 'defaultValue': plan });
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-center text-text-DEFAULT">{t('account_title')}</h1>
            
            <div className="bg-surface border border-gray-200 p-8 rounded-xl shadow-xl">
                <h2 className="text-xl font-semibold mb-6 text-text-DEFAULT">{t('account_subscription_details_title')}</h2>
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="font-medium text-text-light">{t('account_subscription_email')}</span>
                        <span className="font-semibold text-text-DEFAULT">{user.email}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-medium text-text-light">{t('account_subscription_plan')}</span>
                        <span className="font-semibold text-text-DEFAULT capitalize">{translatePlan(user.subscription.plan)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-medium text-text-light">{t('account_subscription_status')}</span>
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClasses(user.subscription.status)}`}>
                            {translateStatus(user.subscription.status)}
                        </span>
                    </div>
                    {user.subscription.status === SubscriptionStatus.ACTIVE && user.subscription.expiryDate && (
                         <div className="flex justify-between items-center">
                            <span className="font-medium text-text-light">{t('account_subscription_expiry')}</span>
                            <span className="font-semibold text-text-DEFAULT">{new Date(user.subscription.expiryDate).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-surface border border-gray-200 p-8 rounded-xl shadow-xl">
                <h2 className="text-xl font-semibold mb-2 text-text-DEFAULT">{t('account_email_change_title')}</h2>
                <p className="text-text-light mb-6">{t('account_email_change_desc')}</p>
                <form className="space-y-4" onSubmit={handleEmailSubmit}>
                    <div className="space-y-3">
                        <input
                            type="email"
                            className="appearance-none relative block w-full px-3 py-3 bg-surface-light border border-gray-300 placeholder-text-dark text-text-DEFAULT focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                            placeholder={t('account_email_change_new')}
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                        />
                        <input
                            type="password"
                            className="appearance-none relative block w-full px-3 py-3 bg-surface-light border border-gray-300 placeholder-text-dark text-text-DEFAULT focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                            placeholder={t('account_email_change_password')}
                            value={emailPassword}
                            onChange={(e) => setEmailPassword(e.target.value)}
                        />
                    </div>
                    {emailError && <p className="text-red-500 text-sm text-center">{emailError}</p>}
                    {emailSuccess && <p className="text-green-600 text-sm text-center">{emailSuccess}</p>}
                    <button
                        type="submit"
                        disabled={emailLoading}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-secondary hover:bg-secondary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-secondary disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                    >
                        {emailLoading ? (
                            <>
                                <SpinnerIcon className="w-5 h-5 mr-2" />
                                {t('account_change_password_button_loading')}
                            </>
                        ) : (
                            t('account_email_change_button')
                        )}
                    </button>
                </form>
            </div>

            <div className="bg-surface border border-gray-200 p-8 rounded-xl shadow-xl">
                <h2 className="text-xl font-semibold mb-6 text-text-DEFAULT">{t('account_changePassword_title')}</h2>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm">
                        <input
                            id="current-password"
                            name="current-password"
                            type="password"
                            autoComplete="current-password"
                            required
                            className={`${inputClasses} rounded-t-md`}
                            placeholder={t('account_current_password')}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                        <input
                            id="new-password"
                            name="new-password"
                            type="password"
                            autoComplete="new-password"
                            required
                            className={`${inputClasses} -mt-px`}
                            placeholder={t('account_new_password')}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <input
                            id="confirm-new-password"
                            name="confirm-new-password"
                            type="password"
                            autoComplete="new-password"
                            required
                            className={`${inputClasses} rounded-b-md -mt-px`}
                            placeholder={t('account_confirm_new_password')}
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    {success && <p className="text-green-600 text-sm text-center">{success}</p>}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? (
                                <>
                                    <SpinnerIcon className="w-5 h-5 mr-2"/>
                                    {t('account_change_password_button_loading')}
                                </>
                            ) : (
                                t('account_change_password_button')
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AccountPage;
