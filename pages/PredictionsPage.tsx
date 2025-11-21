
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/mockApi';
import { Prediction, User } from '../types';
import { useLanguage } from '../App';
import { useAuth } from '../hooks/useAuth';
import { AlertTriangleIcon } from '../components/icons';

const formatDateDisplay = (value: string) => {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString();
    }
    return value.split('T')[0] || value;
};

const formatOdds = (value: number) => {
    return isFinite(value) ? value.toFixed(2) : 'N/A';
};

interface PredictionCardProps {
    prediction: Prediction;
    isSelected: boolean;
    onSelect: () => void;
    suggestedStake: number | null;
}

const PredictionCard: React.FC<PredictionCardProps> = ({ prediction, isSelected, onSelect, suggestedStake }) => {
    const { t } = useLanguage();

    const borderClass = prediction.type === 'big' ? 'border-t-4 border-secondary' : 'border-t-4 border-primary';

    return (
        <div className={`bg-surface border rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative ${borderClass} ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'border-gray-200'}`}>
            <div className="absolute top-3 right-3 z-10">
                <input 
                    type="checkbox"
                    checked={isSelected}
                    onChange={onSelect}
                    className="h-5 w-5 rounded border-gray-400 text-primary focus:ring-primary cursor-pointer"
                />
            </div>
            <div className="p-4">
                <div className="mb-1 pr-8">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">{prediction.league}</p>
                    <p className="text-xs text-text-dark">{formatDateDisplay(prediction.date)}</p>
                </div>
                <h3 className="text-md font-bold text-text-DEFAULT mb-3 truncate" title={prediction.match}>{prediction.match}</h3>
                
                <div className="bg-primary/10 p-2 rounded-md text-center mb-3">
                    <p className="text-[10px] text-primary-dark font-semibold uppercase tracking-wider">{t('predictions_card_ourTip')}</p>
                    <p className="text-lg font-extrabold text-primary-dark">{prediction.tip}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-200 pt-3">
                    <div>
                        <p className="text-[11px] font-medium text-text-light uppercase">{t('predictions_card_odds')}</p>
                        <p className="text-md font-bold text-accent-dark">
                            {formatOdds(prediction.odds)}
                        </p>
                    </div>
                    <div>
                        <p className="text-[11px] font-medium text-text-light uppercase">{t('predictions_card_suggested_stake')}</p>
                        <p className="text-md font-bold text-secondary-dark">
                           {suggestedStake !== null ? suggestedStake.toFixed(2) : (prediction.recommendedStake || '1')}
                        </p>
                    </div>
                    <div>
                        <p className="text-[11px] font-medium text-text-light uppercase">{t('predictions_card_confidence')}</p>
                         <p className={`text-md font-bold ${prediction.type === 'big' && prediction.confidence ? 'text-text-DEFAULT' : 'text-text-dark'}`}>
                           {prediction.type === 'big' && prediction.confidence ? `${prediction.confidence}%` : '-'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const getSegmentType = (date: Date): 'mid-week' | 'weekend' => {
    const day = date.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6
    if (day >= 1 && day <= 4) { // Monday to Thursday
        return 'mid-week';
    }
    return 'weekend'; // Friday, Saturday, Sunday
};

const PredictionsPage: React.FC = () => {
    const [bigLeaguePredictions, setBigLeaguePredictions] = useState<Prediction[]>([]);
    const [smallLeaguePredictions, setSmallLeaguePredictions] = useState<Prediction[]>([]);
    const [loading, setLoading] = useState(true);
    const { t } = useLanguage();
    const { user } = useAuth();
    
    const [selectedPredictions, setSelectedPredictions] = useState<Set<string>>(new Set());
    const [totalStake, setTotalStake] = useState('');
    const [calculatedStakes, setCalculatedStakes] = useState<Record<string, number>>({});
    const [freeAccessSegment, setFreeAccessSegment] = useState<'mid-week' | 'weekend' | null>(null);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [leagueFilter, setLeagueFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'big' | 'small'>('all');
    const [minOdds, setMinOdds] = useState('');
    const [maxOdds, setMaxOdds] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [availableLeagues, setAvailableLeagues] = useState<string[]>([]);
    
    useEffect(() => {
        // Check for free access
        if (user && user.subscription.status !== 'active' && user.freeAccess) {
            const now = new Date();
            const todaySegment = getSegmentType(now);

            if (todaySegment === 'mid-week' && user.freeAccess.midWeekExpires && new Date(user.freeAccess.midWeekExpires) > now) {
                setFreeAccessSegment('mid-week');
            } else if (todaySegment === 'weekend' && user.freeAccess.weekendExpires && new Date(user.freeAccess.weekendExpires) > now) {
                setFreeAccessSegment('weekend');
            }
        }
    }, [user]);

    useEffect(() => {
        const fetchPredictions = async () => {
            setLoading(true);
            try {
                const data = await api.fetchPredictions('pending');
            
                // All pending predictions are shown, regardless of date, until their result is updated.
                let upcomingPredictions = data;

                if (freeAccessSegment) {
                    upcomingPredictions = upcomingPredictions.filter(p => {
                        const pDate = new Date(p.date);
                        return getSegmentType(pDate) === freeAccessSegment;
                    });
                }

                setBigLeaguePredictions(upcomingPredictions.filter(p => p.type === 'big'));
                setSmallLeaguePredictions(upcomingPredictions.filter(p => p.type === 'small'));
                const leagues = Array.from(new Set(upcomingPredictions.map(p => p.league))).sort();
                setAvailableLeagues(leagues);
            } catch (error) {
                console.error("Failed to fetch predictions:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPredictions();
    }, [freeAccessSegment]);

    const handleSelectPrediction = (predictionId: string) => {
        setSelectedPredictions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(predictionId)) {
                newSet.delete(predictionId);
            } else {
                newSet.add(predictionId);
            }
            return newSet;
        });

        setCalculatedStakes(prev => {
            const newStakes = {...prev};
            delete newStakes[predictionId];
            return newStakes;
        });
    };

    const handleCalculateStakes = () => {
        const totalStakeNum = parseFloat(totalStake);
        if (isNaN(totalStakeNum) || totalStakeNum <= 0) return;

        const allPredictions = [...bigLeaguePredictions, ...smallLeaguePredictions];
        const selected = allPredictions.filter(p => selectedPredictions.has(p.id));
        if (selected.length === 0) return;

        const weights = selected.map(p => 1 / p.odds);
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);

        const newStakes: Record<string, number> = {};
        selected.forEach((p, index) => {
            const stake = (weights[index] / totalWeight) * totalStakeNum;
            newStakes[p.id] = stake;
        });

        setCalculatedStakes(newStakes);
    };

    const filteredPredictions = useMemo(() => {
        const all = [...bigLeaguePredictions, ...smallLeaguePredictions];
        const search = searchTerm.trim().toLowerCase();
        const minOddsNum = parseFloat(minOdds);
        const maxOddsNum = parseFloat(maxOdds);
        return all.filter(p => {
            if (typeFilter !== 'all' && p.type !== typeFilter) return false;
            if (leagueFilter !== 'all' && p.league !== leagueFilter) return false;
            if (!isNaN(minOddsNum) && p.odds < minOddsNum) return false;
            if (!isNaN(maxOddsNum) && p.odds > maxOddsNum) return false;
            if (search) {
                const text = `${p.match} ${p.tip} ${p.league}`.toLowerCase();
                if (!text.includes(search)) return false;
            }
            return true;
        });
    }, [bigLeaguePredictions, smallLeaguePredictions, leagueFilter, typeFilter, minOdds, maxOdds, searchTerm]);

    const filteredBig = useMemo(() => filteredPredictions.filter(p => p.type === 'big'), [filteredPredictions]);
    const filteredSmall = useMemo(() => filteredPredictions.filter(p => p.type === 'small'), [filteredPredictions]);

    const handleResetFilters = () => {
        setLeagueFilter('all');
        setTypeFilter('all');
        setMinOdds('');
        setMaxOdds('');
        setSearchTerm('');
    };

    const activeFilters = useMemo(() => {
        const chips: { key: string; label: string; value: string; onRemove: () => void }[] = [];
        if (searchTerm.trim()) {
            chips.push({ key: 'search', label: t('predictions_filter_search'), value: searchTerm.trim(), onRemove: () => setSearchTerm('') });
        }
        if (leagueFilter !== 'all') {
            chips.push({ key: 'league', label: t('predictions_filter_league'), value: leagueFilter, onRemove: () => setLeagueFilter('all') });
        }
        if (typeFilter !== 'all') {
            const typeLabel = typeFilter === 'big' ? t('admin_preds_single_type_big') : t('admin_preds_single_type_small');
            chips.push({ key: 'type', label: t('predictions_filter_tip_type'), value: typeLabel, onRemove: () => setTypeFilter('all') });
        }
        if (minOdds.trim()) {
            chips.push({ key: 'minOdds', label: t('predictions_filter_odds_min'), value: minOdds, onRemove: () => setMinOdds('') });
        }
        if (maxOdds.trim()) {
            chips.push({ key: 'maxOdds', label: t('predictions_filter_odds_max'), value: maxOdds, onRemove: () => setMaxOdds('') });
        }
        return chips;
    }, [searchTerm, leagueFilter, typeFilter, minOdds, maxOdds, t]);

    if (loading) {
        return <div className="text-center">{t('loading')}</div>;
    }

    return (
        <div className="pb-24">
            {freeAccessSegment && (
                <div className="bg-primary/10 border-l-4 border-primary text-primary-dark p-4 mb-8 rounded-r-lg shadow" role="alert">
                    <p className="font-bold">Free Access Granted!</p>
                    <p className="text-sm">You have been granted free access to this week's {freeAccessSegment} predictions due to our guarantee. Enjoy!</p>
                </div>
            )}
            
             <div className="bg-accent/10 border-l-4 border-accent text-accent-dark p-4 mb-8 rounded-r-lg shadow" role="alert">
                <div className="flex">
                    <div className="py-1">
                        <AlertTriangleIcon className="h-6 w-6 text-accent mr-4"/>
                    </div>
                    <div>
                        <p className="font-bold">{t('disclaimer_title')}</p>
                        <p className="text-sm">{t('predictions_disclaimer')}</p>
                    </div>
                </div>
            </div>

            <h1 className="text-3xl font-bold mb-8 text-center text-text-DEFAULT">{t('predictions_title')}</h1>

            <div className="bg-surface border border-gray-200 rounded-xl shadow-lg p-4 mb-4">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-semibold text-text-light">{t('predictions_view_label')}</span>
                        <div className="inline-flex rounded-md shadow-sm border border-gray-200 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setViewMode('card')}
                                className={`px-3 py-2 text-sm font-semibold ${viewMode === 'card' ? 'bg-primary text-white' : 'bg-surface hover:bg-surface-light text-text-dark'}`}
                            >
                                {t('predictions_view_card')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-2 text-sm font-semibold ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-surface hover:bg-surface-light text-text-dark'}`}
                            >
                                {t('predictions_view_list')}
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-semibold text-text-light mb-1">{t('predictions_filter_search')}</label>
                            <input
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder={t('predictions_filter_search_placeholder')}
                                className="w-full px-3 py-2 bg-surface-light border border-gray-300 rounded-md shadow-sm placeholder-text-dark focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-text-light mb-1">{t('predictions_filter_league')}</label>
                            <select
                                value={leagueFilter}
                                onChange={e => setLeagueFilter(e.target.value)}
                                className="w-full px-3 py-2 bg-surface-light border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            >
                                <option value="all">{t('predictions_filter_all')}</option>
                                {availableLeagues.map(league => (
                                    <option key={league} value={league}>{league}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-text-light mb-1">{t('predictions_filter_tip_type')}</label>
                            <select
                                value={typeFilter}
                                onChange={e => setTypeFilter(e.target.value as 'all' | 'big' | 'small')}
                                className="w-full px-3 py-2 bg-surface-light border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                            >
                                <option value="all">{t('predictions_filter_all')}</option>
                                <option value="big">{t('admin_preds_single_type_big')}</option>
                                <option value="small">{t('admin_preds_single_type_small')}</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-1/2">
                                <label className="block text-xs font-semibold text-text-light mb-1">{t('predictions_filter_odds_min')}</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={minOdds}
                                    onChange={e => setMinOdds(e.target.value)}
                                    className="w-full px-3 py-2 bg-surface-light border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                />
                            </div>
                            <div className="w-1/2">
                                <label className="block text-xs font-semibold text-text-light mb-1">{t('predictions_filter_odds_max')}</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={maxOdds}
                                    onChange={e => setMaxOdds(e.target.value)}
                                    className="w-full px-3 py-2 bg-surface-light border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-end">
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="text-sm font-semibold text-primary hover:text-primary-dark"
                        >
                            {t('predictions_filter_reset')}
                        </button>
                    </div>
                </div>
                <div className="flex items-center justify-between text-xs text-text-light mt-3">
                    <p>{filteredPredictions.length} {t('predictions_filter_results_label')}</p>
                </div>
            </div>

            {activeFilters.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                    <span className="text-xs uppercase font-semibold text-text-light tracking-wide">{t('predictions_filter_active')}</span>
                    {activeFilters.map(chip => (
                        <button
                            key={chip.key}
                            onClick={chip.onRemove}
                            className="flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                        >
                            {chip.label}: <span className="font-bold">{chip.value}</span>
                            <span aria-hidden="true">×</span>
                        </button>
                    ))}
                </div>
            )}

            {bigLeaguePredictions.length === 0 && smallLeaguePredictions.length === 0 ? (
                <p className="text-center text-text-light">{t('predictions_none')}</p>
            ) : (
                <div className="space-y-10">
                    {viewMode === 'card' ? (
                        <>
                            {filteredBig.length > 0 && (
                                <section>
                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-secondary/40">
                                        <h2 className="text-2xl font-bold text-text-DEFAULT">{t('predictions_bigLeagues')}</h2>
                                        <span className="text-sm text-text-light">{filteredBig.length} {t('predictions_filter_results_label')}</span>
                                    </div>
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredBig.map(p => (
                                            <PredictionCard
                                                key={p.id}
                                                prediction={p}
                                                isSelected={selectedPredictions.has(p.id)}
                                                onSelect={() => handleSelectPrediction(p.id)}
                                                suggestedStake={calculatedStakes[p.id] ?? null}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}
                            {filteredSmall.length > 0 && (
                                <section>
                                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-primary/40">
                                        <h2 className="text-2xl font-bold text-text-DEFAULT">{t('predictions_smallLeagues')}</h2>
                                        <span className="text-sm text-text-light">{filteredSmall.length} {t('predictions_filter_results_label')}</span>
                                    </div>
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredSmall.map(p => (
                                            <PredictionCard
                                                key={p.id}
                                                prediction={p}
                                                isSelected={selectedPredictions.has(p.id)}
                                                onSelect={() => handleSelectPrediction(p.id)}
                                                suggestedStake={calculatedStakes[p.id] ?? null}
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}
                            {filteredPredictions.length === 0 && (
                                <p className="text-center text-text-light">{t('predictions_none_filtered')}</p>
                            )}
                        </>
                    ) : (
                        <section className="bg-surface border border-gray-200 shadow-lg rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-surface-light">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-text-dark uppercase">{t('predictions_table_select')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-text-dark uppercase">{t('admin_preds_staged_date')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-text-dark uppercase">{t('admin_preds_staged_league')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-text-dark uppercase">{t('admin_preds_staged_match')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-text-dark uppercase">{t('admin_preds_staged_tip')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-text-dark uppercase">{t('admin_preds_staged_odds')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-text-dark uppercase">{t('admin_preds_single_type')}</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-text-dark uppercase">{t('predictions_card_suggested_stake')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-surface divide-y divide-gray-200">
                                        {filteredPredictions.map(p => (
                                            <tr key={p.id} className="hover:bg-surface-light transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPredictions.has(p.id)}
                                                        onChange={() => handleSelectPrediction(p.id)}
                                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm">{formatDateDisplay(p.date)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm">{p.league}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-text-DEFAULT">{p.match}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-text-dark">{p.tip}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-accent-dark">{formatOdds(p.odds)}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.type === 'big' ? 'bg-secondary/10 text-secondary-dark' : 'bg-primary/10 text-primary-dark'}`}>
                                                        {p.type === 'big' ? t('admin_preds_single_type_big') : t('admin_preds_single_type_small')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-secondary-dark">
                                                    {calculatedStakes[p.id]?.toFixed(2) ?? p.recommendedStake ?? '1'}
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredPredictions.length === 0 && (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-6 text-center text-text-light">{t('predictions_none_filtered')}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </div>
            )}

            {selectedPredictions.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-gray-200 shadow-2xl z-40">
                    <div className="container mx-auto p-4">
                       <div className="max-w-3xl mx-auto bg-surface p-4 rounded-lg shadow-inner border border-gray-200">
                             <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-center sm:text-left">
                                    <h3 className="font-bold text-text-DEFAULT">{t('stake_calculator_title')}</h3>
                                    <p className="text-sm text-text-light">{t('stake_calculator_selected', { count: selectedPredictions.size.toString() })}</p>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className="flex-grow">
                                        <label htmlFor="totalStake" className="sr-only">{t('stake_calculator_total_stake_label')}</label>
                                        <input 
                                            type="number"
                                            id="totalStake"
                                            value={totalStake}
                                            onChange={(e) => setTotalStake(e.target.value)}
                                            placeholder={t('stake_calculator_total_stake_placeholder')}
                                            className="w-full px-3 py-2 bg-surface-light border border-gray-300 rounded-md shadow-sm placeholder-text-dark focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleCalculateStakes}
                                        className="bg-primary text-white font-bold py-2 px-4 rounded-md shadow-md hover:bg-primary-dark transition-all disabled:bg-gray-300 flex-shrink-0"
                                    >
                                        {t('stake_calculator_button')}
                                    </button>
                                </div>
                            </div>
                       </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PredictionsPage;
