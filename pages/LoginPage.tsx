import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePage, useLanguage, useSettings } from '../App';
import { FootballIcon } from '../components/icons';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const { setCurrentPage } = usePage();
    const { t } = useLanguage();
    const { settings } = useSettings();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            // Successful login is handled by the useEffect in App.tsx which redirects the user.
        } catch (err: any) {
            switch (err.message) {
                case 'invalid_credentials':
                    setError(t('login_error_credentials'));
                    break;
                case 'device_limit_reached':
                    setError(t('login_error_device_limit'));
                    break;
                default:
                    setError(t('login_error_generic'));
                    break;
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-surface border border-gray-200 p-10 rounded-xl shadow-xl">
                <div>
                    <div className="mx-auto h-12 w-auto flex items-center justify-center">
                        {settings.logoUrl ? (
                            <img src={settings.logoUrl} alt={`${settings.pageTitle} logo`} className="h-12 w-auto object-contain" />
                        ) : (
                            <FootballIcon className="h-12 w-12 text-primary" />
                        )}
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-text-DEFAULT">
                        {t('login_title')}
                    </h2>
                    <p className="mt-2 text-center text-sm text-text-dark">
                        {t('login_or')}{' '}
                        <button onClick={() => setCurrentPage('register')} className="font-medium text-primary hover:text-primary-dark">
                            {t('login_createAccount')}
                        </button>
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-3 bg-surface-light border border-gray-300 placeholder-text-dark text-text-DEFAULT rounded-t-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                placeholder={t('login_emailPlaceholder')}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-3 bg-surface-light border border-gray-300 placeholder-text-dark text-text-DEFAULT rounded-b-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                placeholder={t('login_passwordPlaceholder')}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? t('login_button_loading') : t('login_button')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
