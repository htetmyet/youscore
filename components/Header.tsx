

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePage, useSettings, useLanguage } from '../App';
import { FootballIcon, BellIcon, LightBulbIcon, CheckCircleIcon, AlertTriangleIcon, MenuIcon, XIcon } from './icons';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationType, Page } from '../types';

const NotificationItem: React.FC<{ notification: import('../types').Notification; onMarkAsRead: (id: string) => void }> = ({ notification, onMarkAsRead }) => {
    
    const getIcon = (type: NotificationType) => {
        switch (type) {
            case NotificationType.NEW_PREDICTIONS:
                return <LightBulbIcon className="w-6 h-6 text-secondary" />;
            case NotificationType.SUBSCRIPTION_APPROVED:
                return <CheckCircleIcon className="w-6 h-6 text-primary" />;
            case NotificationType.SUBSCRIPTION_EXPIRING:
                return <AlertTriangleIcon className="w-6 h-6 text-accent" />;
            default:
                return <BellIcon className="w-6 h-6 text-text-dark" />;
        }
    };
    
    const timeAgo = (date: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return Math.floor(seconds) + "s ago";
    };


    return (
        <div className={`p-3 flex items-start gap-3 border-b border-gray-200 last:border-b-0 hover:bg-surface-light ${!notification.isRead ? 'bg-primary/5' : ''}`}>
            <div className="flex-shrink-0 mt-1">{getIcon(notification.type)}</div>
            <div className="flex-grow">
                <p className="text-sm text-text-DEFAULT">{notification.message}</p>
                <p className="text-xs text-text-dark mt-1">{timeAgo(notification.timestamp)}</p>
            </div>
             {!notification.isRead && (
                <button 
                    onClick={() => onMarkAsRead(notification.id)} 
                    className="flex-shrink-0 w-3 h-3 bg-primary rounded-full mt-1"
                    title="Mark as read"
                />
            )}
        </div>
    );
};

const Header: React.FC = () => {
    const { user, logout } = useAuth();
    const { currentPage, setCurrentPage } = usePage();
    const { settings } = useSettings();
    const { language, setLanguage, t } = useLanguage();
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

    const [langDropdownOpen, setLangDropdownOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const userMenuRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setNotificationsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);


    const handleLogout = () => {
        logout();
        setCurrentPage('login');
        setUserMenuOpen(false);
        setIsMobileMenuOpen(false);
    };
    
    const handleMobileLinkClick = (page: Page) => {
        setCurrentPage(page);
        setIsMobileMenuOpen(false);
    };

    const navLinkClasses = "px-4 py-2 rounded-md text-sm font-medium transition-colors text-text-light hover:bg-primary hover:text-white";
    const activeNavLinkClasses = "bg-primary/10 text-primary-dark";
    
    const mobileNavLinkClasses = "block px-3 py-2 rounded-md text-base font-medium transition-colors text-text-light hover:bg-primary hover:text-white";
    const activeMobileNavLinkClasses = "bg-primary/10 text-primary-dark";

    return (
        <header className="bg-background/80 backdrop-blur-sm border-b border-gray-200 text-text-DEFAULT shadow-sm sticky top-0 z-50">
            <div className="container mx-auto flex items-center justify-between p-4">
                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentPage(user ? 'dashboard' : 'home')}>
                    {settings.logoUrl ? (
                        <img src={settings.logoUrl} alt="Site Logo" className="h-8 w-auto" />
                    ) : (
                        <FootballIcon className="h-8 w-8 text-primary" />
                    )}
                    <h1 className="text-xl font-bold tracking-tight text-text-DEFAULT">{settings.pageTitle}</h1>
                </div>
                <nav className="hidden md:flex items-center space-x-2">
                    {user && user.role === 'admin' && (
                         <button onClick={() => setCurrentPage('admin')} className={`${navLinkClasses} ${currentPage === 'admin' ? activeNavLinkClasses : ''}`}>{t('adminDashboard')}</button>
                    )}
                    {user && (user.subscription.status === 'active' || user.role === 'admin') && (
                        <>
                            <button onClick={() => setCurrentPage('dashboard')} className={`${navLinkClasses} ${currentPage === 'dashboard' ? activeNavLinkClasses : ''}`}>{t('dashboard')}</button>
                            <button onClick={() => setCurrentPage('predictions')} className={`${navLinkClasses} ${currentPage === 'predictions' ? activeNavLinkClasses : ''}`}>{t('predictions')}</button>
                            <button onClick={() => setCurrentPage('history')} className={`${navLinkClasses} ${currentPage === 'history' ? activeNavLinkClasses : ''}`}>{t('history')}</button>
                        </>
                    )}
                </nav>
                <div className="flex items-center space-x-4">
                     <div className="relative">
                        <button 
                            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                            className="text-sm font-medium transition-colors text-text-light hover:text-primary flex items-center"
                        >
                            {language === 'en' ? 'EN' : 'MY'}
                            <svg className={`w-4 h-4 ml-1 transition-transform ${langDropdownOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>
                        {langDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-32 bg-surface rounded-md shadow-lg py-1 z-50 border border-gray-200" onMouseLeave={() => setLangDropdownOpen(false)}>
                                <button onClick={() => { setLanguage('en'); setLangDropdownOpen(false); }} className={`block w-full text-left px-4 py-2 text-sm ${language === 'en' ? 'bg-primary/10 text-primary' : 'text-text-DEFAULT'} hover:bg-surface-light`}>
                                    {t('english')}
                                </button>
                                <button onClick={() => { setLanguage('my'); setLangDropdownOpen(false); }} className={`block w-full text-left px-4 py-2 text-sm ${language === 'my' ? 'bg-primary/10 text-primary' : 'text-text-DEFAULT'} hover:bg-surface-light`}>
                                    {t('burmese')}
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {user && (
                         <div className="relative" ref={notificationsRef}>
                            <button onClick={() => setNotificationsOpen(!notificationsOpen)} className="text-text-light hover:text-primary relative p-1">
                                <BellIcon className="w-6 h-6" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center ring-2 ring-background">{unreadCount}</span>
                                )}
                            </button>
                            {notificationsOpen && (
                                <div className="absolute right-0 mt-2 w-80 bg-surface rounded-lg shadow-2xl z-50 border border-gray-200 max-h-96 overflow-y-auto">
                                    <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                                        <h4 className="font-bold text-text-DEFAULT">{t('notifications_title')}</h4>
                                        {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs text-primary hover:underline">{t('notifications_mark_all_read')}</button>}
                                    </div>
                                    {notifications.length === 0 ? (
                                        <p className="p-4 text-center text-sm text-text-light">{t('notifications_none')}</p>
                                    ) : (
                                        <div>
                                            {notifications.map(n => <NotificationItem key={n.id} notification={n} onMarkAsRead={markAsRead} />)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="hidden md:flex items-center space-x-4">
                        {!user ? (
                            <>
                                <button onClick={() => setCurrentPage('login')} className="text-sm font-medium transition-colors text-text-light hover:text-primary">{t('logIn')}</button>
                                <button onClick={() => setCurrentPage('register')} className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30">{t('signUp')}</button>
                            </>
                        ) : (
                            <div className="relative" ref={userMenuRef}>
                                <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center space-x-2 text-sm font-medium text-text-light hover:text-primary">
                                    <span>{user.email}</span>
                                    <svg className={`w-4 h-4 transition-transform ${userMenuOpen ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </button>
                                {userMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-surface rounded-md shadow-lg py-1 z-50 border border-gray-200">
                                        <button 
                                            onClick={() => { setCurrentPage('account'); setUserMenuOpen(false); }} 
                                            className="block w-full text-left px-4 py-2 text-sm text-text-DEFAULT hover:bg-surface-light"
                                        >
                                            {t('account')}
                                        </button>
                                        <button 
                                            onClick={handleLogout} 
                                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                        >
                                            {t('logout')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-1 rounded-md text-text-dark hover:text-primary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                            aria-controls="mobile-menu"
                            aria-expanded={isMobileMenuOpen}
                        >
                            <span className="sr-only">Open main menu</span>
                            {isMobileMenuOpen ? <XIcon className="block h-6 w-6" /> : <MenuIcon className="block h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>
            
            {isMobileMenuOpen && (
                <div className="md:hidden" id="mobile-menu">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {user && user.role === 'admin' && (
                            <button onClick={() => handleMobileLinkClick('admin')} className={`${mobileNavLinkClasses} ${currentPage === 'admin' ? activeMobileNavLinkClasses : ''}`}>{t('adminDashboard')}</button>
                        )}
                        {user && (user.subscription.status === 'active' || user.role === 'admin') && (
                            <>
                                <button onClick={() => handleMobileLinkClick('dashboard')} className={`${mobileNavLinkClasses} ${currentPage === 'dashboard' ? activeMobileNavLinkClasses : ''}`}>{t('dashboard')}</button>
                                <button onClick={() => handleMobileLinkClick('predictions')} className={`${mobileNavLinkClasses} ${currentPage === 'predictions' ? activeMobileNavLinkClasses : ''}`}>{t('predictions')}</button>
                                <button onClick={() => handleMobileLinkClick('history')} className={`${mobileNavLinkClasses} ${currentPage === 'history' ? activeMobileNavLinkClasses : ''}`}>{t('history')}</button>
                            </>
                        )}
                    </div>
                     <div className="pt-4 pb-3 border-t border-gray-200">
                        {user ? (
                            <div className="px-5">
                                <div className="text-sm font-medium text-text-DEFAULT truncate">{user.email}</div>
                                <div className="mt-3 space-y-1">
                                    <button 
                                        onClick={() => handleMobileLinkClick('account')} 
                                        className={`${mobileNavLinkClasses} ${currentPage === 'account' ? activeMobileNavLinkClasses : ''}`}
                                    >
                                        {t('account')}
                                    </button>
                                    <button 
                                        onClick={handleLogout} 
                                        className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
                                    >
                                        {t('logout')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                             <div className="px-5 space-y-3">
                                <button onClick={() => handleMobileLinkClick('register')} className="w-full bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30">{t('signUp')}</button>
                                <button onClick={() => handleMobileLinkClick('login')} className="w-full text-sm font-medium transition-colors text-text-light hover:text-primary">{t('logIn')}</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;