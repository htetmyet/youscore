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
import { LandingCredibilityPoint, LandingSections, LandingStatHighlight, LandingTestimonial, Prediction, PredictionResult } from '../types';
import { defaultLandingSections } from '../landingDefaults';

const PitchPattern = () => (
    <div className="absolute inset-0 z-0 overflow-hidden opacity-30 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute -top-1/3 -left-1/4">
            <defs>
                <linearGradient id="pitchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
                </linearGradient>
                <pattern id="pitch" patternUnits="userSpaceOnUse" width="220" height="160">
                    <rect width="220" height="160" fill="transparent" />
                    <circle cx="110" cy="80" r="24" stroke="url(#pitchGradient)" strokeWidth="1.5" fill="none" />
                    <line x1="110" y1="0" x2="110" y2="160" stroke="url(#pitchGradient)" strokeWidth="1.5" />
                    <rect x="0" y="25" width="35" height="110" rx="4" stroke="url(#pitchGradient)" strokeWidth="1.5" fill="none" />
                    <rect x="185" y="25" width="35" height="110" rx="4" stroke="url(#pitchGradient)" strokeWidth="1.5" fill="none" />
                </pattern>
            </defs>
            <rect fill="url(#pitch)" width="200%" height="200%" />
        </svg>
    </div>
);

const ResultCard: React.FC<{ prediction: Prediction }> = ({ prediction }) => {
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
                <span className="font-bold text-primary-light">
                    {prediction.tip} @ {prediction.odds.toFixed(2)}
                </span>
            </div>
        </div>
    );
};

const TestimonialCard: React.FC<{ quote: string; author: string; role: string }> = ({ quote, author, role }) => (
    <div className="bg-white border border-surface-light rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-6 w-40 h-40 bg-secondary/10 rounded-full blur-2xl" />
        <div className="relative">
            <p className="text-lg text-text-DEFAULT font-semibold mb-4">&ldquo;{quote}&rdquo;</p>
            <div>
                <p className="font-bold text-primary">{author}</p>
                <p className="text-sm text-text-dark">{role}</p>
            </div>
        </div>
    </div>
);

const FALLBACK_HISTORY: Prediction[] = [
    {
        id: 'sample-1',
        date: '2024-08-17',
        league: 'Premier League',
        match: 'Arsenal vs Tottenham',
        tip: 'Arsenal -0.5',
        odds: 1.92,
        result: PredictionResult.WON,
        type: 'big',
        confidence: 84,
        finalScore: '2-0',
    },
    {
        id: 'sample-2',
        date: '2024-08-18',
        league: 'La Liga',
        match: 'Real Madrid vs Girona',
        tip: 'Over 2.5 Goals',
        odds: 1.88,
        result: PredictionResult.RETURN,
        type: 'big',
        confidence: 78,
        finalScore: '2-1',
    },
    {
        id: 'sample-3',
        date: '2024-08-19',
        league: 'Serie A',
        match: 'Inter vs Lazio',
        tip: 'Inter ML',
        odds: 1.95,
        result: PredictionResult.WON,
        type: 'big',
        confidence: 81,
        finalScore: '1-0',
    },
    {
        id: 'sample-4',
        date: '2024-08-21',
        league: 'AFC Champions League',
        match: 'Yokohama F. Marinos vs Bangkok United',
        tip: 'Both Teams to Score',
        odds: 1.85,
        result: PredictionResult.LOSS,
        type: 'small',
        confidence: 73,
        finalScore: '2-0',
    },
];

const HomePage: React.FC = () => {
    const { setCurrentPage } = usePage();
    const { t } = useLanguage();
    const { settings } = useSettings();
    const [recentHistory, setRecentHistory] = useState<Prediction[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    useEffect(() => {
        let isCancelled = false;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const fetchHistory = async () => {
            setLoadingHistory(true);
            try {
                const data = await api.fetchPredictions('history', { signal: controller.signal });
                if (isCancelled) {
                    return;
                }
                data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const trimmed = data.slice(0, 8);
                setRecentHistory(trimmed.length ? trimmed : FALLBACK_HISTORY);
            } catch (error) {
                if (isCancelled) {
                    return;
                }
                console.error('Failed to fetch history:', error);
                setRecentHistory(FALLBACK_HISTORY);
            } finally {
                if (!isCancelled) {
                    setLoadingHistory(false);
                }
                clearTimeout(timeoutId);
            }
        };

        fetchHistory();

        return () => {
            isCancelled = true;
            controller.abort();
            clearTimeout(timeoutId);
        };
    }, []);

    const wins = recentHistory.filter((prediction) => prediction.result === PredictionResult.WON).length;
    const returns = recentHistory.filter((prediction) => prediction.result === PredictionResult.RETURN).length;
    const winRate = recentHistory.length ? Math.round((wins / recentHistory.length) * 100) : 0;

    const landingSections: LandingSections = settings.landingSections ?? defaultLandingSections;
    const statHighlights: LandingStatHighlight[] = landingSections.stats?.length ? landingSections.stats : defaultLandingSections.stats;
    const credibilityPoints: (LandingCredibilityPoint & { accent?: string })[] = (landingSections.credibility?.length ? landingSections.credibility : defaultLandingSections.credibility).map((point, index) => ({
        ...point,
        accent: index === 0 ? 'from-emerald-400/20 to-emerald-500/5' : index === 1 ? 'from-sky-400/20 to-sky-500/5' : 'from-amber-400/20 to-amber-500/5',
    }));
    const testimonials: LandingTestimonial[] = landingSections.testimonials?.length ? landingSections.testimonials : defaultLandingSections.testimonials;

    const processSteps = [
        {
            title: t('home_process_discovery_title'),
            copy: t('home_process_discovery_desc'),
            icon: <LightBulbIcon className="w-6 h-6" />,
        },
        {
            title: t('home_process_quality_title'),
            copy: t('home_process_quality_desc'),
            icon: <IdentificationIcon className="w-6 h-6" />,
        },
        {
            title: t('home_process_schedule_title'),
            copy: t('home_process_schedule_desc'),
            icon: <CalendarDaysIcon className="w-6 h-6" />,
        },
    ];

    return (
        <div className="space-y-24 md:space-y-32">
            {/* Hero */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent px-6 py-16 md:px-10 md:py-20 shadow-2xl text-white">
                <PitchPattern />
                <div className="absolute top-10 right-20 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <FootballIcon className="w-10 h-10 text-white" />
                            <p className="uppercase tracking-[0.35em] text-xs font-semibold">{landingSections.heroTagline || t('home_tagline')}</p>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
                            {settings.pageTitle || 'ProTips Football Predictor'}
                        </h1>
                        <p className="text-white/80 text-lg mb-8 max-w-xl">{landingSections.heroSubtitle || t('home_subtitle')}</p>
                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={() => setCurrentPage('register')}
                                className="bg-white text-primary font-bold py-3 px-8 rounded-full shadow-lg shadow-primary/40 transition-transform hover:-translate-y-1"
                            >
                                {landingSections.primaryCta || t('home_cta_primary')}
                            </button>
                            <button
                                onClick={() => setCurrentPage('login')}
                                className="backdrop-blur-sm border border-white/40 text-white font-semibold py-3 px-8 rounded-full hover:bg-white/10 transition-colors"
                            >
                                {landingSections.secondaryCta || t('home_cta_secondary')}
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-6 mt-10">
                            <div>
                                <p className="text-3xl font-bold">{winRate || 0}%</p>
                                <p className="text-white/70 text-xs uppercase tracking-[0.3em]">Win Rate (Last 8)</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold">
                                    {wins}/{recentHistory.length || 8}
                                </p>
                                <p className="text-white/70 text-xs uppercase tracking-[0.3em]">Settled Tickets</p>
                            </div>
                            <div>
                                <p className="text-3xl font-bold">{returns}</p>
                                <p className="text-white/70 text-xs uppercase tracking-[0.3em]">Refunds</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/10 border border-white/30 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Live Feed</p>
                                <h3 className="text-2xl font-bold">Trusted Performance</h3>
                            </div>
                            <TrophyIcon className="w-10 h-10 text-white" />
                        </div>
                        <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                            {loadingHistory && (
                                <div className="text-center py-10 text-white/80 flex flex-col items-center gap-3">
                                    <SpinnerIcon className="w-6 h-6" />
                                    <p>{t('loading')}</p>
                                </div>
                            )}
                            {!loadingHistory &&
                                recentHistory.slice(0, 4).map((prediction) => (
                                    <div key={prediction.id} className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col gap-2">
                                        <div className="flex justify-between text-sm text-white/70">
                                            <span>{new Date(prediction.date).toLocaleDateString()}</span>
                                            <span className="font-semibold">{prediction.result}</span>
                                        </div>
                                        <p className="font-semibold text-lg">{prediction.match}</p>
                                        <p className="text-white/70 text-sm">
                                            {prediction.tip} @ {prediction.odds.toFixed(2)}
                                        </p>
                                    </div>
                                ))}
                            {!loadingHistory && recentHistory.length === 0 && (
                                <p className="text-white/80 text-center">{t('home_no_history')}</p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Stat Highlights */}
            <section className="grid md:grid-cols-3 gap-6">
                {statHighlights.map((stat, index) => (
                    <div key={`${stat.label}-${index}`} className="bg-gradient-to-br from-white via-white to-surface p-6 rounded-2xl border border-surface-light shadow-lg">
                        <p className="text-4xl font-extrabold text-primary mb-2">{stat.value}</p>
                        <p className="font-semibold text-text-DEFAULT">{stat.label}</p>
                        <p className="text-sm text-text-light mt-2">{stat.detail}</p>
                    </div>
                ))}
            </section>

            {/* Credibility */}
            <section className="grid md:grid-cols-3 gap-8">
                {credibilityPoints.map((point, index) => (
                    <div key={`${point.title}-${index}`} className="bg-white rounded-2xl border border-surface-light shadow-xl p-8 relative overflow-hidden">
                        <div className={`absolute inset-0 bg-gradient-to-br ${point.accent ?? 'from-primary/5 to-secondary/5'}`} />
                        <div className="relative">
                            <h3 className="text-2xl font-semibold mb-3 text-text-DEFAULT">{point.title}</h3>
                            <p className="text-text-light">{point.description}</p>
                        </div>
                    </div>
                ))}
            </section>

            {/* Live Results Carousel */}
            <section className="bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 rounded-3xl p-10 shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
                    <div>
                        <p className="text-sm uppercase tracking-[0.3em] text-text-dark">Proof of execution</p>
                        <h2 className="text-3xl font-bold text-text-DEFAULT mt-2">Recent Track Record</h2>
                    </div>
                    <div className="flex gap-6 text-center">
                        <div>
                            <p className="text-3xl font-bold text-primary">{wins}</p>
                            <p className="text-text-light text-sm">Wins</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-secondary">{returns}</p>
                            <p className="text-text-light text-sm">Money-back</p>
                        </div>
                        <div>
                            <p className="text-3xl font-bold text-accent">{recentHistory.length}</p>
                            <p className="text-text-light text-sm">Tickets posted</p>
                        </div>
                    </div>
                </div>
                {loadingHistory ? (
                    <div className="p-8 text-center flex items-center justify-center">
                        <SpinnerIcon className="w-6 h-6 mr-2 text-primary" /> {t('home_performance_loading')}
                    </div>
                ) : recentHistory.length === 0 ? (
                    <p className="p-8 text-center text-text-light">{t('home_performance_none')}</p>
                ) : (
                    <div className="relative">
                        <div className="absolute top-0 bottom-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-10" />
                        <div className="absolute top-0 bottom-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-10" />
                        <div className="flex space-x-6 overflow-x-auto pb-4 px-4 no-scrollbar">
                            {recentHistory.map((prediction) => (
                                <ResultCard key={prediction.id} prediction={prediction} />
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* Process Section */}
            <section className="grid lg:grid-cols-2 gap-10 items-stretch">
                <div className="bg-white rounded-3xl p-10 shadow-2xl border border-surface-light relative overflow-hidden">
                    <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
                    <div className="relative">
                        <div className="flex items-center gap-4 mb-6">
                            <IdentificationIcon className="w-12 h-12 text-primary" />
                            <div>
                                <h2 className="text-2xl font-bold text-text-DEFAULT">{t('home_process_title')}</h2>
                                <p className="text-text-light">{t('home_process_subtitle')}</p>
                            </div>
                        </div>
                        <div className="space-y-6">
                            {processSteps.map((step) => (
                                <div key={step.title} className="flex gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                                        {step.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-text-DEFAULT">{step.title}</h3>
                                        <p className="text-text-light">{step.copy}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-secondary/10 via-primary/5 to-accent/10 rounded-3xl p-10 shadow-xl border border-secondary/20 space-y-8">
                    <div>
                        <h3 className="text-xl font-semibold mb-3 text-text-DEFAULT">{t('home_process_schedule_title')}</h3>
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
                        <h3 className="text-xl font-semibold mb-3 text-text-DEFAULT">{t('home_process_leagues_title')}</h3>
                        <p className="text-text-light">{t('home_process_leagues_desc')}</p>
                        <p className="text-xs text-text-dark mt-2">{t('home_process_leagues_international')}</p>
                    </div>
                    <div className="border-t border-white/40 pt-6">
                        <h3 className="text-xl font-semibold mb-3 text-text-DEFAULT">{t('home_guarantee_title')}</h3>
                        <p className="text-text-light">{t('home_guarantee_desc')}</p>
                    </div>
                </div>
            </section>

            {/* Supported Leagues */}
            {settings.supportedLeagues && settings.supportedLeagues.length > 0 && (
                <section className="py-12 bg-surface rounded-3xl shadow-inner">
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

            {/* Features */}
            <section className="max-w-6xl mx-auto">
                <h2 className="text-3xl font-bold text-center mb-12 text-text-DEFAULT">Your Winning Toolkit</h2>
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-white border border-primary/20 p-8 rounded-3xl shadow-lg hover:-translate-y-2 transition-transform">
                        <div className="flex items-center justify-center w-14 h-14 bg-primary/10 text-primary rounded-2xl mb-5">
                            <ChartBarIcon className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-text-DEFAULT">Data-Driven Insights</h3>
                        <p className="text-text-light">Advanced statistical models layered on top of scouting intel for every single card we publish.</p>
                    </div>
                    <div className="bg-white border border-secondary/20 p-8 rounded-3xl shadow-lg hover:-translate-y-2 transition-transform">
                        <div className="flex items-center justify-center w-14 h-14 bg-secondary/10 text-secondary rounded-2xl mb-5">
                            <CalendarDaysIcon className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-text-DEFAULT">Twice-Weekly Briefings</h3>
                        <p className="text-text-light">Tuesday and Friday drop schedules keep you prepared for both mid-week and blockbuster fixtures.</p>
                    </div>
                    <div className="bg-white border border-accent/20 p-8 rounded-3xl shadow-lg hover:-translate-y-2 transition-transform">
                        <div className="flex items-center justify-center w-14 h-14 bg-accent/10 text-accent rounded-2xl mb-5">
                            <TrophyIcon className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-text-DEFAULT">Transparent Ledger</h3>
                        <p className="text-text-light">Real-time notification receipts and archived slips make auditing every play effortless.</p>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="bg-gradient-to-br from-primary/5 via-white to-secondary/5 rounded-3xl p-12 shadow-xl space-y-10">
                <div className="text-center">
                    <p className="text-sm uppercase tracking-[0.3em] text-text-dark">Community proof</p>
                    <h2 className="text-3xl font-bold text-text-DEFAULT mt-2">Loved by Elite Bettors & Clubs</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                    {testimonials.map((testimonial, index) => (
                        <TestimonialCard key={`${testimonial.author}-${index}`} {...testimonial} />
                    ))}
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
