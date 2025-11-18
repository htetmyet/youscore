
import React, { useState, useEffect } from 'react';
import { api } from '../services/mockApi';
import { WeeklyStat } from '../types';
import { useLanguage } from '../App';
import { SpinnerIcon } from '../components/icons';

const KPICard: React.FC<{ title: string; value: string; colorClass: string; isUnits?: boolean }> = ({ title, value, colorClass, isUnits = false }) => (
    <div className="bg-surface border border-gray-200 p-6 rounded-lg shadow-lg">
        <h3 className="text-sm font-medium text-text-light">{title}</h3>
        <p className={`text-3xl font-bold ${colorClass}`}>
            {value}
            {isUnits && <span className="text-lg ml-1 text-text-dark">Units</span>}
        </p>
    </div>
);

const DashboardPage: React.FC = () => {
    const [stats, setStats] = useState<WeeklyStat[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const data = await api.fetchWeeklyStats();
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch weekly stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const allTimeStats = stats.reduce(
        (acc, week) => {
            acc.totalStaked += week.totalStaked;
            acc.totalReturned += week.totalReturned;
            acc.winCount += week.winCount;
            acc.lossCount += week.lossCount;
            acc.returnCount += week.returnCount;
            return acc;
        },
        { totalStaked: 0, totalReturned: 0, winCount: 0, lossCount: 0, returnCount: 0 }
    );

    const totalPL = allTimeStats.totalReturned - allTimeStats.totalStaked;
    const totalROI = allTimeStats.totalStaked > 0 ? (totalPL / allTimeStats.totalStaked) * 100 : 0;
    const totalBets = allTimeStats.winCount + allTimeStats.lossCount;
    const winRate = totalBets > 0 ? (allTimeStats.winCount / totalBets) * 100 : 0;

    const maxAbsPL = Math.max(...stats.map(s => Math.abs(s.profitOrLoss)), 1);


    if (loading) {
        return (
            <div className="text-center py-10">
                <SpinnerIcon className="w-8 h-8 mx-auto text-primary" />
                <p className="mt-2 text-text-light">{t('dashboard_loading')}</p>
            </div>
        );
    }
    
    if (stats.length === 0) {
        return (
             <div className="text-center py-10">
                <p className="text-text-light">{t('dashboard_noData')}</p>
            </div>
        )
    }

    return (
        <div className="space-y-12">
            <h1 className="text-3xl font-bold text-center text-text-DEFAULT">{t('dashboard_title')}</h1>
            
            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard 
                    title={t('dashboard_allTimePL')} 
                    value={totalPL.toFixed(2)} 
                    colorClass={totalPL >= 0 ? 'text-primary' : 'text-red-500'}
                    isUnits
                />
                <KPICard 
                    title={t('dashboard_roi')} 
                    value={`${totalROI.toFixed(2)}%`}
                    colorClass={totalROI >= 0 ? 'text-primary' : 'text-red-500'}
                />
                <KPICard 
                    title={t('dashboard_winRate')} 
                    value={`${winRate.toFixed(2)}%`}
                    colorClass="text-secondary-dark"
                />
            </div>
            
            {/* Weekly P/L Chart */}
            <div className="bg-surface border border-gray-200 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4 text-text-DEFAULT">{t('dashboard_weeklyPLChart')}</h2>
                <div className="flex items-end space-x-2 h-64 border-l border-b border-gray-200 p-2 overflow-x-auto">
                    {stats.slice().reverse().map(week => (
                        <div key={week.weekIdentifier} className="flex-shrink-0 w-12 text-center group relative">
                            <div 
                                className={`w-full rounded-t-md transition-all duration-300 ${week.profitOrLoss >= 0 ? 'bg-primary hover:bg-primary-dark' : 'bg-red-500 hover:bg-red-600'}`}
                                style={{ height: `${(Math.abs(week.profitOrLoss) / maxAbsPL) * 100}%` }}
                            >
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-text-DEFAULT opacity-0 group-hover:opacity-100 transition-opacity">
                                    {week.profitOrLoss.toFixed(2)}
                                </span>
                            </div>
                            <p className="text-xs text-text-dark mt-1 whitespace-nowrap">{week.weekIdentifier.replace('-W', ' W')}</p>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Weekly Breakdown Table */}
            <div className="bg-surface border border-gray-200 shadow-xl rounded-lg overflow-hidden">
                 <h2 className="text-xl font-semibold p-6 text-text-DEFAULT">{t('dashboard_weeklyBreakdown')}</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-surface-light">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-text-dark uppercase">{t('dashboard_week')}</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-text-dark uppercase">{t('dashboard_totalStaked')}</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-text-dark uppercase">{t('dashboard_totalReturned')}</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-text-dark uppercase">{t('dashboard_pl')}</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-text-dark uppercase">ROI</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-text-dark uppercase">{t('dashboard_record')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface divide-y divide-gray-200">
                            {stats.map(week => (
                                <tr key={week.weekIdentifier} className="hover:bg-surface-light transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-DEFAULT">
                                        {week.weekIdentifier}
                                        <div className="text-xs text-text-dark">{week.startDate} to {week.endDate}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light">{week.totalStaked.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light">{week.totalReturned.toFixed(2)}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${week.profitOrLoss >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                        {week.profitOrLoss.toFixed(2)}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${week.roi >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                        {week.roi.toFixed(2)}%
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light">
                                        <span className="text-primary-dark font-semibold">{week.winCount}</span> - 
                                        <span className="text-red-600 font-semibold">{week.lossCount}</span> - 
                                        <span className="text-secondary-dark font-semibold">{week.returnCount}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;