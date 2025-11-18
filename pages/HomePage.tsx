


import React, { useState, useEffect } from 'react';
import { usePage, useLanguage, useSettings } from '../App';
import {
    FootballIcon,
    TrophyIcon,
    SpinnerIcon,
    CheckCircleIcon,
    XCircleIcon,
    ChartBarIcon,
    CalendarDaysIcon,
    IdentificationIcon,
    LightBulbIcon,
    ArrowUturnLeftIcon,
} from '../components/icons';
import { api } from '../services/mockApi';
import { Prediction, PredictionResult } from '../types';

const PitchPattern = () => (
    <div className="absolute inset-0 z-0 overflow-hidden opacity-20">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute -top-1/2 -left-1/4">
            <defs>
                <pattern id="pitch" patternUnits="userSpaceOnUse" width="200" height="140">
                    <rect width="200" height="140" fill="transparent" />
                    <circle cx="100" cy="70" r="20" stroke="rgba(0, 0, 0, 0.04)" strokeWidth="1" fill="none" />
                    <line x1="100" y1="0" x2="100" y2="140" stroke="rgba(0, 0, 0, 0.04)" strokeWidth="1" />
                    <rect x="0" y="20" width="30" height="100" stroke="rgba(0, 0, 0, 0.04)" strokeWidth="1" fill="none" />
                    <rect x="170" y="20" width="30" height="100" stroke="rgba(0, 0, 0, 0.04)" strokeWidth="1" fill="none" />
                </pattern>
            </defs>
            <rect fill="url(#pitch)" width="200%" height="200%" />
        </svg>
    </div>
);

const ResultCard: React.FC<{prediction: Prediction}> = ({ prediction }) => {
    const { t } = useLanguage();

    const getResultStyles = (result: PredictionResult) => {
        switch (result) {
            case PredictionResult.WON:
                return {
                    badge: 'bg-primary/90 border-primary-dark text-white',
                    icon: <CheckCircleIcon className="w-4 h-4" />,
                };
            case PredictionResult.LOSS:
                return {
                    badge: 'bg-red-600/90 border-red-700 text-white',
                    icon: <XCircleIcon className="w-4 h-4" />,
                };
            case PredictionResult.RETURN:
                return {
                    badge: 'bg-secondary/90 border-secondary-dark text-white',
                    icon: <ArrowUturnLeftIcon className="w-4 h-4" />,
                };
            default:
                return { badge: 'bg-surface-light text-text-light', icon: null };
        }
    };
    
    const translateResult = (result: PredictionResult) => {
        const key = `result_${result.toLowerCase()}` as any;
        return t(key);
    };

    const { badge, icon } = getResultStyles(prediction.result);

    return (
        <div className="flex-shrink-0 w-72 bg-surface rounded-xl border border-surface-light shadow-lg p-4 space-y-3 transition-transform hover:-translate-y-1">
            <div className="flex justify-between items-center">
                <p className="text-xs text-text-dark">{prediction.date}</p>
                <span className={`px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1 border ${badge}`}>
                    {icon} {translateResult(prediction.result)}
                </span>
            </div>
            <p className="font-bold text-text-DEFAULT">{prediction.match}</p>
            <div className="bg-surface-light rounded-lg p-2 flex justify-between items-center text-sm">
                <span className="text-text-dark">{t('home_ourTip')}</span>
                <span className="font-bold text-primary-light">{prediction.tip} @ {prediction.odds.toFixed(2)}</span>
            </div>
        </div>
    );
};


const HomePage: React.FC = () => {
    const { setCurrentPage } = usePage();
    const { t } = useLanguage();
    const { settings } = useSettings();
    const [recentHistory, setRecentHistory] = useState<Prediction[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoadingHistory(true);
            try {
                const data = await api.fetchPredictions('history');
                data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setRecentHistory(data.slice(0, 8)); // Get the last 8 results
            } catch (error) {
                console.error("Failed to fetch history:", error);
            } finally {
                setLoadingHistory(false);
            }
        };
        fetchHistory();
    }, []);
    
    return (
        <div className="space-y-24 md:space-y-32">
            {/* Hero Section */}
            <section className="relative text-center pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">
                <PitchPattern />
                <div className="relative z-10">
                    <FootballIcon className="w-20 h-20 mx-auto mb-6 text-primary animate-pulse" />
                    <h1 className="text-4xl md:text-6xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-text-DEFAULT to-text-dark tracking-tight">UNLEASH YOUR <span className="text-primary-light">WINNING</span> STREAK</h1>
                    <p className="text-lg text-text-light max-w-3xl mx-auto mb-10">
                        Leverage expert, data-driven football predictions to dominate your bets. Precision, Profit, and Passion in every tip.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
                        <button
                            onClick={() => setCurrentPage('register')}
                            className="w-full sm:w-auto bg-primary text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all transform hover:scale-105 animate-glow"
                        >
                           Join Now & Win
                        </button>
                        <button
                            onClick={() => setCurrentPage('login')}
                            className="w-full sm:w-auto text-text-light font-medium py-3 px-8 rounded-full transition-all hover:text-text-DEFAULT"
                        >
                            {t('home_hero_member')}
                        </button>
                    </div>
                </div>
            </section>
            
            {/* Recent Performance Section */}
            <section className="max-w-7xl mx-auto -mt-10">
                <h2 className="text-2xl font-bold text-center mb-8 text-text-DEFAULT">Proof in the Pudding: Our Recent Results</h2>
                 {loadingHistory ? (
                    <div className="p-8 text-center flex items-center justify-center">
                        <SpinnerIcon className="w-6 h-6 mr-2 text-primary" /> {t('home_performance_loading')}
                    </div>
                ) : recentHistory.length === 0 ? (
                    <p className="p-8 text-center text-text-light">{t('home_performance_none')}</p>
                ) : (
                    <div className="relative">
                        <div className="absolute top-0 bottom-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-10"></div>
                        <div className="absolute top-0 bottom-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-10"></div>
                        <div className="flex space-x-6 overflow-x-auto pb-4 px-4 no-scrollbar">
                           {recentHistory.map(p => <ResultCard key={p.id} prediction={p} />)}
                        </div>
                    </div>
                )}
            </section>

             {/* How It Works Section */}
            <section className="max-w-5xl mx-auto text-center">
                <h2 className="text-3xl font-bold text-center mb-4 text-text-DEFAULT">Get Started in 3 Easy Steps</h2>
                <p className="text-lg text-text-light max-w-2xl mx-auto mb-12">
                    We've simplified the process, so you can focus on what matters most: winning.
                </p>
                <div className="grid md:grid-cols-3 gap-8 relative">
                    <div className="absolute top-1/2 left-0 w-full h-px bg-surface-light hidden md:block"></div>
                    <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-primary to-secondary hidden md:block" style={{width: '66%'}}></div>
                    <div className="relative bg-background p-6 rounded-lg text-center z-10">
                        <div className="flex items-center justify-center w-16 h-16 bg-primary/10 text-primary rounded-full mb-4 mx-auto ring-8 ring-background">
                            <IdentificationIcon className="w-8 h-8"/>
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-text-DEFAULT">1. Subscribe</h3>
                        <p className="text-text-light">Choose a plan that fits your needs and get instant access.</p>
                    </div>
                    <div className="relative bg-background p-6 rounded-lg text-center z-10">
                        <div className="flex items-center justify-center w-16 h-16 bg-primary/10 text-primary rounded-full mb-4 mx-auto ring-8 ring-background">
                            <LightBulbIcon className="w-8 h-8"/>
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-text-DEFAULT">2. Get Tips</h3>
                        <p className="text-text-light">Receive daily, expertly curated predictions for major leagues.</p>
                    </div>
                    <div className="relative bg-background p-6 rounded-lg text-center z-10">
                        <div className="flex items-center justify-center w-16 h-16 bg-primary/10 text-primary rounded-full mb-4 mx-auto ring-8 ring-background">
                            <TrophyIcon className="w-8 h-8"/>
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-text-DEFAULT">3. Win Big</h3>
                        <p className="text-text-light">Use our insights to place informed bets and track your success.</p>
                    </div>
                </div>
            </section>
            
            {/* Our Process & Coverage Section */}
            <section className="max-w-5xl mx-auto">
                <h2 className="text-3xl font-bold text-center mb-4 text-text-DEFAULT">{t('home_process_title')}</h2>
                <p className="text-lg text-text-light max-w-2xl mx-auto mb-12 text-center">
                    {t('home_process_subtitle')}
                </p>
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-12 bg-surface border border-gray-200 p-8 rounded-xl shadow-lg">
                    <div>
                        <h3 className="text-xl font-semibold mb-3">{t('home_process_schedule_title')}</h3>
                        <p className="text-text-light mb-4">{t('home_process_schedule_desc')}</p>
                        <ul className="space-y-3">
                            <li className="flex items-start">
                                <CalendarDaysIcon className="w-6 h-6 text-primary mr-3 mt-1 flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold text-text-DEFAULT">{t('home_process_schedule_tue')}</h4>
                                    <p className="text-text-light">{t('home_process_schedule_tue_desc')}</p>
                                </div>
                            </li>
                            <li className="flex items-start">
                                <CalendarDaysIcon className="w-6 h-6 text-primary mr-3 mt-1 flex-shrink-0" />
                                <div>
                                    <h4 className="font-bold text-text-DEFAULT">{t('home_process_schedule_fri')}</h4>
                                    <p className="text-text-light">{t('home_process_schedule_fri_desc')}</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold mb-3">{t('home_process_leagues_title')}</h3>
                        <p className="text-text-light">{t('home_process_leagues_desc')}</p>
                        <p className="text-xs text-text-dark mt-2">{t('home_process_leagues_international')}</p>
                    </div>
                     <div className="md:col-span-2 border-t border-gray-200 pt-8">
                         <h3 className="text-xl font-semibold mb-3">{t('home_guarantee_title')}</h3>
                         <p className="text-text-light">{t('home_guarantee_desc')}</p>
                     </div>
                </div>
            </section>


            {/* Supported Leagues */}
            {settings.supportedLeagues && settings.supportedLeagues.length > 0 && (
                <section className="py-12 bg-surface">
                    <h3 className="text-center text-lg font-semibold text-text-dark mb-8 uppercase tracking-widest">Leagues We Cover</h3>
                    <div className="w-full overflow-x-hidden">
                        <div className="flex animate-marquee whitespace-nowrap group-hover:[animation-play-state:paused]">
                            {[...settings.supportedLeagues, ...settings.supportedLeagues].map((league, index) => (
                               <div key={`${league.name}-${index}`} className="flex-shrink-0 flex items-center justify-center w-52" title={league.name}>
                                   <img src={league.logoUrl} alt={league.name} className="h-10 w-auto object-contain" />
                               </div>
                           ))}
                        </div>
                    </div>
                </section>
            )}


            {/* Features Section */}
            <section className="max-w-5xl mx-auto">
                <h2 className="text-3xl font-bold text-center mb-12 text-text-DEFAULT">Your Winning Toolkit</h2>
                <div className="grid md:grid-cols-3 gap-8">
                     <div className="bg-surface border border-surface-light p-8 rounded-lg shadow-lg transform transition-transform hover:-translate-y-2">
                        <div className="flex items-center justify-center w-12 h-12 bg-primary/10 text-primary rounded-full mb-5">
                            <ChartBarIcon className="w-6 h-6"/>
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-text-DEFAULT">Data-Driven Insights</h3>
                        <p className="text-text-light">Our predictions are powered by advanced statistical models, not just guesswork.</p>
                    </div>
                     <div className="bg-surface border border-surface-light p-8 rounded-lg shadow-lg transform transition-transform hover:-translate-y-2">
                        <div className="flex items-center justify-center w-12 h-12 bg-primary/10 text-primary rounded-full mb-5">
                            <CalendarDaysIcon className="w-6 h-6"/>
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-text-DEFAULT">Daily Expert Picks</h3>
                        <p className="text-text-light">Fresh tips are delivered twice a week, covering all major weekend and mid-week games.</p>
                    </div>
                     <div className="bg-surface border border-surface-light p-8 rounded-lg shadow-lg transform transition-transform hover:-translate-y-2">
                        <div className="flex items-center justify-center w-12 h-12 bg-primary/10 text-primary rounded-full mb-5">
                            <TrophyIcon className="w-6 h-6"/>
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-text-DEFAULT">Proven Performance</h3>
                        <p className="text-text-light">A transparent history of our wins and losses, because we believe in accountability.</p>
                    </div>
                </div>
            </section>
            
            {/* Final CTA */}
            <section className="max-w-4xl mx-auto text-center py-16">
                 <h2 className="text-4xl font-extrabold mb-4 text-text-DEFAULT">Ready to Start Winning?</h2>
                 <p className="text-lg text-text-light max-w-2xl mx-auto mb-8">
                    Join a community of smart bettors. Your next winning tip is just a click away.
                </p>
                <button
                    onClick={() => setCurrentPage('register')}
                    className="bg-primary text-white font-bold py-4 px-10 rounded-full shadow-lg transition-all transform hover:scale-105 animate-glow"
                >
                    Sign Up Today
                </button>
            </section>
        </div>
    );
};

export default HomePage;