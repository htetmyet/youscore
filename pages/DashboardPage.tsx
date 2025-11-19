
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
    const chartWeeks = stats.slice().reverse();
    const getBarSections = (value: number) => ({
        positive: value > 0 ? (value / maxAbsPL) * 50 : 0,
        negative: value < 0 ? (Math.abs(value) / maxAbsPL) * 50 : 0,
    });
    const aggregatePL = stats.reduce(
        (acc, week) => {
            if (week.profitOrLoss >= 0) {
                acc.totalProfit += week.profitOrLoss;
            } else {
                acc.totalLoss += Math.abs(week.profitOrLoss);
            }
            return acc;
        },
        { totalProfit: 0, totalLoss: 0 }
    );
    const maxAggregate = Math.max(aggregatePL.totalProfit, aggregatePL.totalLoss, 1);


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
                <div className="relative h-64">
                    <div className="absolute left-4 top-6 text-xs font-semibold text-primary">{t('dashboard_profit')}</div>
                    <div className="absolute left-4 bottom-6 text-xs font-semibold text-red-500">{t('dashboard_loss')}</div>
                    <div className="absolute left-2 right-2 top-1/2 border-t border-gray-200" aria-hidden="true" />
                    <div className="flex items-stretch space-x-3 h-full overflow-x-auto pl-16 pr-4">
                        {chartWeeks.map(week => {
                            const { positive, negative } = getBarSections(week.profitOrLoss);
                            return (
                                <div key={week.weekIdentifier} className="flex-shrink-0 w-16 text-center group">
                                    <div className="relative h-full">
                                        {positive > 0 && (
                                            <div className="absolute left-1/2 bottom-1/2 -translate-x-1/2 flex flex-col items-center">
                                                <span className="mb-1 text-xs font-semibold text-text-DEFAULT opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {week.profitOrLoss.toFixed(2)}
                                                </span>
                                                <div
                                                    className="w-3/4 rounded-t-md bg-primary transition-colors duration-300 group-hover:bg-primary-dark"
                                                    style={{ height: `${positive}%` }}
                                                />
                                            </div>
                                        )}
                                        {negative > 0 && (
                                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 flex flex-col items-center">
                                                <div
                                                    className="w-3/4 rounded-b-md bg-red-500 transition-colors duration-300 group-hover:bg-red-600"
                                                    style={{ height: `${negative}%` }}
                                                />
                                                <span className="mt-1 text-xs font-semibold text-text-DEFAULT opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {week.profitOrLoss.toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                        {week.profitOrLoss === 0 && (
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-secondary-dark" />
                                        )}
                                    </div>
                                    <p className="text-xs text-text-dark mt-2 whitespace-nowrap">{week.weekIdentifier.replace('-W', ' W')}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="flex items-center justify-end gap-4 mt-4 text-xs text-text-light">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-primary" />
                        <span className="font-medium text-text-DEFAULT">{t('dashboard_profit')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="font-medium text-text-DEFAULT">{t('dashboard_loss')}</span>
                    </div>
                </div>
            </div>
            
            {/* Profit vs Loss Overview */}
            <div className="bg-surface border border-gray-200 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4 text-text-DEFAULT">{t('dashboard_profitLossOverview')}</h2>
                <div className="space-y-4">
                    {[
                        { label: t('dashboard_profit'), value: aggregatePL.totalProfit, color: 'bg-primary' },
                        { label: t('dashboard_loss'), value: aggregatePL.totalLoss, color: 'bg-red-500' },
                    ].map(item => (
                        <div key={item.label}>
                            <div className="flex justify-between mb-2 text-sm text-text-light">
                                <span className="font-medium text-text-DEFAULT">{item.label}</span>
                                <span className="font-semibold text-text-DEFAULT">{item.value.toFixed(2)}</span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-3 ${item.color}`}
                                    style={{ width: `${(item.value / maxAggregate) * 100}%` }}
                                />
                            </div>
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
