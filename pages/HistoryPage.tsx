

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/mockApi';
import { Prediction, PredictionResult } from '../types';
import { useLanguage } from '../App';

const ITEMS_PER_PAGE = 20;

const PaginationControls: React.FC<{
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
    }

    return (
        <div className="flex flex-wrap justify-center items-center gap-2 mt-6">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-surface-light hover:bg-surface disabled:opacity-50"
            >
                Prev
            </button>
            {pages.map(page => (
                <button
                    key={page}
                    onClick={() => onPageChange(page)}
                    className={`px-3 py-1.5 text-sm border rounded-md ${page === currentPage ? 'bg-primary text-white border-primary shadow' : 'border-gray-300 bg-surface-light hover:bg-surface'}`}
                >
                    {page}
                </button>
            ))}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-surface-light hover:bg-surface disabled:opacity-50"
            >
                Next
            </button>
        </div>
    );
};

const getResultColor = (result: PredictionResult) => {
    switch (result) {
        case PredictionResult.WON:
            return 'bg-primary/10 text-primary-dark border border-primary/20';
        case PredictionResult.LOSS:
            return 'bg-red-500/10 text-red-600 border border-red-500/20';
        case PredictionResult.RETURN:
            return 'bg-secondary/10 text-secondary-dark border border-secondary/20';
        default:
            return 'bg-surface-light text-text-light border border-gray-200';
    }
};

const HistoryPage: React.FC = () => {
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const { t } = useLanguage();

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const data = await api.fetchPredictions('history');
                // Sort by date, most recent first
                data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setPredictions(data);
                setCurrentPage(1);
            } catch (error) {
                console.error("Failed to fetch prediction history:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const totalPages = Math.ceil(predictions.length / ITEMS_PER_PAGE);
    const paginatedPredictions = useMemo(
        () => predictions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
        [predictions, currentPage]
    );

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const translateResult = (result: PredictionResult) => {
        const key = `result_${result.toLowerCase()}` as any;
        return t(key);
    };

    if (loading) {
        return <div className="text-center">{t('history_loading')}</div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6 text-center text-text-DEFAULT">{t('history_title')}</h1>
            <div className="bg-surface border border-gray-200 shadow-xl rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-surface-light">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-dark uppercase tracking-wider">{t('history_table_date')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-dark uppercase tracking-wider">{t('history_table_match')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-dark uppercase tracking-wider">{t('history_table_tip')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-dark uppercase tracking-wider">{t('history_table_odds')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-dark uppercase tracking-wider">{t('history_table_stake')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-dark uppercase tracking-wider">{t('admin_history_table_score')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-dark uppercase tracking-wider">{t('history_table_result')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface divide-y divide-gray-200">
                            {predictions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-4 text-center text-text-light">{t('history_table_none')}</td>
                                </tr>
                            ) : (
                                paginatedPredictions.map((p) => (
                                    <tr key={p.id} className="hover:bg-surface-light transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light">
                                            {new Date(p.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-DEFAULT">{p.match}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-light">{p.tip}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-accent-dark font-semibold">
                                            {typeof p.odds === 'number' ? p.odds.toFixed(2) : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-dark font-semibold">
                                            {p.recommendedStake || 1}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-text-DEFAULT">{p.finalScore || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getResultColor(p.result)}`}>
                                                {translateResult(p.result)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
};

export default HistoryPage;
