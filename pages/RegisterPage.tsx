import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePage, useLanguage } from '../App';
import { FootballIcon } from '../components/icons';

const RegisterPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const { setCurrentPage } = usePage();
    const { t } = useLanguage();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError(t('register_error_passwordMatch'));
            return;
        }
        setError('');
        setLoading(true);
        try {
            const newUser = await register(email, password);
            if (newUser) {
                alert(t('register_success'));
                setCurrentPage('login');
            }
        } catch (err: any) {
            if (err.message === 'email_in_use') {
                setError(t('register_error_email_in_use'));
            } else {
                setError(t('register_error_generic'));
            }
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = "appearance-none relative block w-full px-3 py-3 bg-surface-light border border-gray-300 placeholder-text-dark text-text-DEFAULT focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";

    return (
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-surface border border-gray-200 p-10 rounded-xl shadow-xl">
                <div>
                    <FootballIcon className="mx-auto h-12 w-auto text-primary"/>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-text-DEFAULT">
                        {t('register_title')}
                    </h2>
                     <p className="mt-2 text-center text-sm text-text-dark">
                        {t('register_or')}{' '}
                        <button onClick={() => setCurrentPage('login')} className="font-medium text-primary hover:text-primary-dark">
                           {t('register_signIn')}
                        </button>
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm">
                        <input
                            name="email"
                            type="email"
                            required
                            className={`${inputClasses} rounded-t-md`}
                            placeholder={t('login_emailPlaceholder')}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <input
                            name="password"
                            type="password"
                            required
                            className={`${inputClasses} -mt-px`}
                            placeholder={t('register_passwordPlaceholder')}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <input
                            name="confirm-password"
                            type="password"
                            required
                            className={`${inputClasses} rounded-b-md -mt-px`}
                            placeholder={t('register_confirmPasswordPlaceholder')}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-primary disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? t('register_button_loading') : t('register_button')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegisterPage;