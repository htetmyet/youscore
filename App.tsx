



import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import LoginPage from './pages/LoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import PredictionsPage from './pages/PredictionsPage';
import SubscriptionPage from './pages/SubscriptionPage';
import HistoryPage from './pages/HistoryPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import Header from './components/Header';
import { useAuth, AuthProvider } from './hooks/useAuth';
import { Page, AppSettings, User } from './types';
import { api } from './services/mockApi';
import { translations } from './i18n/translations';
import DashboardPage from './pages/DashboardPage';
import AccountPage from './pages/AccountPage';
import { NotificationProvider } from './hooks/useNotifications';
import { defaultLandingSections } from './landingDefaults';

// Page Context
const PageContext = createContext<{
    currentPage: Page;
    setCurrentPage: React.Dispatch<React.SetStateAction<Page>>;
}>({
    currentPage: 'home',
    setCurrentPage: () => { },
});
export const usePage = () => useContext(PageContext);

// Settings Context
const SettingsContext = createContext<{
    settings: AppSettings;
    refreshSettings: () => Promise<void>;
}>({
    settings: { pageTitle: 'ProTips Football Predictor', logoUrl: null, supportedLeagues: [], landingSections: defaultLandingSections },
    refreshSettings: async () => { },
});
export const useSettings = () => useContext(SettingsContext);

// Language Context
type Language = 'en' | 'my';
type TranslationKey = keyof typeof translations.en;

const LanguageContext = createContext<{
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey, replacements?: Record<string, string>) => string;
}>({
    language: 'en',
    setLanguage: () => { },
    t: (key) => key,
});
export const useLanguage = () => useContext(LanguageContext);

const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(() => (localStorage.getItem('language') as Language) || 'en');

    const setLanguage = (lang: Language) => {
        localStorage.setItem('language', lang);
        setLanguageState(lang);
    };

    const t = useCallback((key: TranslationKey, replacements?: Record<string, string>): string => {
        let translation = translations[language][key] || translations.en[key] || key;
        if (replacements) {
            Object.keys(replacements).forEach(rKey => {
                translation = translation.replace(`{${rKey}}`, replacements[rKey]);
            });
        }
        return translation;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};


const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<AppSettings>({ pageTitle: 'ProTips', logoUrl: null, supportedLeagues: [], landingSections: defaultLandingSections });
    const { t } = useLanguage();

    const refreshSettings = useCallback(async () => {
        try {
            const fetchedSettings = await api.fetchSettings();
            setSettings(fetchedSettings);
        } catch (error) {
            console.error("Failed to fetch app settings:", error);
        }
    }, []);

    useEffect(() => {
        refreshSettings();
    }, [refreshSettings]);

    useEffect(() => {
        document.title = settings.pageTitle || t('appName');

        // Update Favicon
        const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (link) {
            if (settings.logoUrl) {
                link.href = settings.logoUrl;
            } else {
                link.href = '/favicon.svg';
            }
        }
    }, [settings.pageTitle, settings.logoUrl, t]);

    return (
        <SettingsContext.Provider value={{ settings, refreshSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};


const AppContent: React.FC = () => {
    const { user, loading } = useAuth();
    const { currentPage, setCurrentPage } = usePage();
    const { t, language } = useLanguage();
    const { settings } = useSettings();

    const getSegmentType = (date: Date): 'mid-week' | 'weekend' => {
        const day = date.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6
        if (day >= 1 && day <= 4) { // Monday to Thursday
            return 'mid-week';
        }
        return 'weekend'; // Friday, Saturday, Sunday
    };

    const hasFreeAccess = (user: User | null): boolean => {
        if (!user || !user.freeAccess) return false;

        const now = new Date();
        const todaySegment = getSegmentType(now);

        if (todaySegment === 'mid-week' && user.freeAccess.midWeekExpires) {
            return new Date(user.freeAccess.midWeekExpires) > now;
        }
        if (todaySegment === 'weekend' && user.freeAccess.weekendExpires) {
            return new Date(user.freeAccess.weekendExpires) > now;
        }

        return false;
    };

    useEffect(() => {
        if (!loading) {
            if (!user) {
                if (currentPage !== 'register' && currentPage !== 'home') {
                    setCurrentPage('login');
                }
            } else if (user.role === 'admin') {
                if (currentPage !== 'admin' && currentPage !== 'dashboard' && currentPage !== 'account' && currentPage !== 'predictions' && currentPage !== 'history') {
                    setCurrentPage('admin');
                }
            } else if (user.subscription.status === 'active' || hasFreeAccess(user)) {
                if (currentPage !== 'history' && currentPage !== 'predictions' && currentPage !== 'dashboard' && currentPage !== 'account') {
                    setCurrentPage('dashboard');
                }
            } else {
                if (currentPage !== 'subscription' && currentPage !== 'account') {
                    setCurrentPage('subscription');
                }
            }
        }
    }, [user, loading, currentPage, setCurrentPage]);

    const renderPage = () => {
        if (loading) {
            return <div className="flex justify-center items-center h-screen"><p>{t('loading')}</p></div>;
        }

        switch (currentPage) {
            case 'login':
                return <LoginPage />;
            case 'register':
                return <RegisterPage />;
            case 'admin':
                return <AdminDashboardPage />;
            case 'dashboard':
                return <DashboardPage />;
            case 'predictions':
                return <PredictionsPage />;
            case 'history':
                return <HistoryPage />;
            case 'subscription':
                return <SubscriptionPage />;
            case 'account':
                return <AccountPage />;
            case 'home':
            default:
                return user ? (user.role === 'admin' ? <AdminDashboardPage /> : <DashboardPage />) : <HomePage />;
        }
    };

    return (
        <div className={`min-h-screen flex flex-col ${language === 'my' ? 'font-burmese' : 'font-sans'}`}>
            <Header />
            <main className="flex-grow container mx-auto p-4 md:p-8">
                {renderPage()}
            </main>
            <footer className="bg-surface border-t border-surface-light text-text-dark py-8 mt-12">
                <div className="container mx-auto px-4 flex flex-col items-center justify-center space-y-4">
                    <div className="flex items-center space-x-3">
                        {settings.logoUrl && (
                            <img src={settings.logoUrl} alt="Site Logo" className="h-8 w-auto opacity-80 grayscale hover:grayscale-0 transition-all" />
                        )}
                        <span className="text-lg font-semibold text-text-DEFAULT">{settings.pageTitle}</span>
                    </div>
                    <p className="text-sm">
                        {t('footer_text', {
                            year: new Date().getFullYear().toString(),
                            siteTitle: settings.pageTitle || t('appName'),
                        })}
                    </p>
                </div>
            </footer>
        </div>
    );
};


const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<Page>('home');

    return (
        <LanguageProvider>
            <SettingsProvider>
                <AuthProvider>
                    <NotificationProvider>
                        <PageContext.Provider value={{ currentPage, setCurrentPage }}>
                            <AppContent />
                        </PageContext.Provider>
                    </NotificationProvider>
                </AuthProvider>
            </SettingsProvider>
        </LanguageProvider>
    );
};

export default App;
