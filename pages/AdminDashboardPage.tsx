
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api } from '../services/mockApi';
import { User, Prediction, SubscriptionStatus, PredictionResult, SubscriptionPlan, League, Subscription } from '../types';
import { useAuth } from '../hooks/useAuth';
import Modal from '../components/Modal';
import { SpinnerIcon, XCircleIcon } from '../components/icons';
import { useSettings, useLanguage } from '../App';

const PaginationControls: React.FC<{
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
    }

    return (
        <div className="flex justify-center items-center space-x-2 mt-4 py-2">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded bg-surface text-sm disabled:opacity-50 hover:bg-surface-light"
            >
                Previous
            </button>
            {pageNumbers.map(number => (
                <button
                    key={number}
                    onClick={() => onPageChange(number)}
                    className={`px-3 py-1 border rounded text-sm ${currentPage === number ? 'bg-primary text-white border-primary' : 'bg-surface border-gray-300 hover:bg-surface-light'}`}
                >
                    {number}
                </button>
            ))}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded bg-surface text-sm disabled:opacity-50 hover:bg-surface-light"
            >
                Next
            </button>
        </div>
    );
}

interface ActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const ActionModal: React.FC<ActionModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]" onClick={onClose}>
            <div className="bg-surface border border-surface-light p-6 rounded-lg shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <button onClick={onClose} className="text-text-dark hover:text-text-light text-2xl">&times;</button>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
};


// User Management Component
const UserManagement: React.FC<{ users: User[], refreshUsers: () => void }> = ({ users, refreshUsers }) => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'all'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const USERS_PER_PAGE = 10;

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [editedSub, setEditedSub] = useState<Partial<Subscription>>({});
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const [approvingId, setApprovingId] = useState<string | null>(null);

    const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    
    const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenActionMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    useEffect(() => {
        if (selectedUser) {
            setEditedSub({
                plan: selectedUser.subscription.plan,
                status: selectedUser.subscription.status,
                expiryDate: selectedUser.subscription.expiryDate ? new Date(selectedUser.subscription.expiryDate).toISOString().split('T')[0] : '',
            });
        }
    }, [selectedUser]);

    const filteredUsers = useMemo(() => {
        return users
            .filter(user => statusFilter === 'all' || user.subscription.status === statusFilter)
            .filter(user => user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [users, statusFilter, searchTerm]);

    const paginatedUsers = useMemo(() => {
        return filteredUsers.slice((currentPage - 1) * USERS_PER_PAGE, currentPage * USERS_PER_PAGE);
    }, [filteredUsers, currentPage]);

    const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
        setOpenActionMenuId(null);
    };

    const openDeleteModal = (user: User) => {
        setSelectedUser(user);
        setIsDeleteModalOpen(true);
        setOpenActionMenuId(null);
    };

    const openChangePasswordModal = (user: User) => {
        setSelectedUser(user);
        setNewPassword('');
        setConfirmNewPassword('');
        setPasswordError('');
        setIsChangePasswordModalOpen(true);
        setOpenActionMenuId(null);
    };

    const handleApprove = async (userId: string) => {
        setApprovingId(userId);
        await api.approveSubscription(userId);
        refreshUsers();
        setApprovingId(null);
        setOpenActionMenuId(null);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setIsSubmitting(true);
        
        const currentSub = selectedUser.subscription;
        const updatedSub: Subscription = {
            ...currentSub,
            plan: editedSub.plan ?? currentSub.plan,
            status: editedSub.status ?? currentSub.status,
            expiryDate: editedSub.expiryDate ? new Date(editedSub.expiryDate).toISOString() : null,
        };

        await api.updateUser(selectedUser.id, { subscription: updatedSub });
        
        setIsSubmitting(false);
        setIsEditModalOpen(false);
        refreshUsers();
    };

    const handleDelete = async () => {
        if (!selectedUser) return;
        setIsSubmitting(true);
        await api.deleteUser(selectedUser.id);
        setIsSubmitting(false);
        setIsDeleteModalOpen(false);
        refreshUsers();
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        if (newPassword !== confirmNewPassword) {
            setPasswordError(t('account_password_change_error_match'));
            return;
        }
        if (!newPassword) {
            setPasswordError('Password cannot be empty.');
            return;
        }
        if (!selectedUser) return;
        
        setIsSubmitting(true);
        await api.changePassword(selectedUser.id, newPassword);
        setIsSubmitting(false);
        setIsChangePasswordModalOpen(false);
        alert(`Password for ${selectedUser.email} has been changed.`);
    };

    const getStatusClasses = (status: SubscriptionStatus) => {
        switch (status) {
            case SubscriptionStatus.ACTIVE: return 'bg-green-100 text-green-800';
            case SubscriptionStatus.PENDING: return 'bg-yellow-100 text-yellow-800';
            case SubscriptionStatus.EXPIRED: return 'bg-red-100 text-red-800';
            case SubscriptionStatus.INACTIVE: return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    
    const translateStatus = (status: SubscriptionStatus) => {
        const key = `status_${status}` as any;
        return t(key, { 'defaultValue': status });
    };

    return (
        <div>
            {paymentScreenshot && <Modal imageUrl={paymentScreenshot} onClose={() => setPaymentScreenshot(null)} />}
            <ActionModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={t('modal_edit_sub_title')}>
                <form onSubmit={handleEditSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-light">{t('modal_edit_sub_plan')}</label>
                            <select 
                                value={editedSub.plan}
                                onChange={e => setEditedSub(s => ({...s, plan: e.target.value as SubscriptionPlan}))}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                            >
                                {Object.values(SubscriptionPlan).map(plan => <option key={plan} value={plan}>{plan}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-text-light">{t('modal_edit_sub_status')}</label>
                            <select 
                                value={editedSub.status}
                                onChange={e => setEditedSub(s => ({...s, status: e.target.value as SubscriptionStatus}))}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                            >
                                {Object.values(SubscriptionStatus).map(status => <option key={status} value={status}>{status}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-text-light">{t('modal_edit_sub_expiry')}</label>
                             <input 
                                type="date"
                                value={editedSub.expiryDate || ''}
                                onChange={e => setEditedSub(s => ({...s, expiryDate: e.target.value}))}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                             />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={() => setIsEditModalOpen(false)} className="bg-surface-light text-text-light px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200">{t('cancel')}</button>
                        <button type="submit" disabled={isSubmitting} className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark disabled:bg-gray-300 flex items-center">{isSubmitting && <SpinnerIcon className="w-4 h-4 mr-2"/>}{t('save_changes')}</button>
                    </div>
                </form>
            </ActionModal>
            
            <ActionModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title={t('modal_delete_title')}>
                <p>{t('modal_delete_confirm_text', { email: selectedUser?.email || '' })}</p>
                 <div className="mt-6 flex justify-end space-x-3">
                    <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="bg-surface-light text-text-light px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200">{t('cancel')}</button>
                    <button onClick={handleDelete} disabled={isSubmitting} className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:bg-gray-300 flex items-center">{isSubmitting && <SpinnerIcon className="w-4 h-4 mr-2"/>}{t('confirm_delete')}</button>
                </div>
            </ActionModal>

            <ActionModal isOpen={isChangePasswordModalOpen} onClose={() => setIsChangePasswordModalOpen(false)} title={t('modal_change_password_title')}>
                <form onSubmit={handleChangePassword}>
                    <p className="text-sm text-text-light mb-4">Changing password for: <span className="font-bold text-text-DEFAULT">{selectedUser?.email}</span></p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-light">{t('account_new_password')}</label>
                            <input 
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="mt-1 block w-full pl-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-light">{t('account_confirm_new_password')}</label>
                            <input 
                                type="password"
                                value={confirmNewPassword}
                                onChange={e => setConfirmNewPassword(e.target.value)}
                                className="mt-1 block w-full pl-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                            />
                        </div>
                        {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={() => setIsChangePasswordModalOpen(false)} className="bg-surface-light text-text-light px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200">{t('cancel')}</button>
                        <button type="submit" disabled={isSubmitting} className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark disabled:bg-gray-300 flex items-center">{isSubmitting && <SpinnerIcon className="w-4 h-4 mr-2"/>}{t('account_change_password_button')}</button>
                    </div>
                </form>
            </ActionModal>

            <h3 className="text-xl font-semibold mb-4">{t('admin_users_all_title')} ({users.length})</h3>

            <div className="flex flex-col md:flex-row justify-between items-center mb-4 space-y-2 md:space-y-0">
                <div className="w-full md:w-1/2 lg:w-1/3">
                    <input 
                        type="text"
                        placeholder={t('admin_users_search_placeholder')}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 bg-surface-light border border-gray-300 rounded-md shadow-sm placeholder-text-dark focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    />
                </div>
                 <div>
                    <label htmlFor="statusFilter" className="sr-only">{t('admin_users_filter_status')}</label>
                    <select
                        id="statusFilter"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as SubscriptionStatus | 'all')}
                        className="w-full md:w-auto px-3 py-2 bg-surface-light border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    >
                        <option value="all">{t('admin_users_filter_all')}</option>
                        {Object.values(SubscriptionStatus).map(s => <option key={s} value={s}>{translateStatus(s)}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-surface border border-gray-200 shadow-lg rounded-lg overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-surface-light">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-text-dark uppercase">{t('admin_users_table_email')}</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-text-dark uppercase">{t('admin_users_table_plan')}</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-text-dark uppercase">{t('admin_users_table_status')}</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-text-dark uppercase">{t('admin_users_table_expiry')}</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-text-dark uppercase">{t('admin_users_table_actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-surface divide-y divide-gray-200">
                        {paginatedUsers.map(user => (
                            <tr key={user.id} className="hover:bg-surface-light transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-sm">{user.email}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm capitalize">{user.subscription.plan}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClasses(user.subscription.status)}`}>
                                        {translateStatus(user.subscription.status)}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    {user.subscription.expiryDate ? new Date(user.subscription.expiryDate).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm relative">
                                    <button onClick={() => setOpenActionMenuId(user.id === openActionMenuId ? null : user.id)} className="text-text-dark hover:text-primary p-1 rounded-full">
                                        ...
                                    </button>
                                    {openActionMenuId === user.id && (
                                        <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-surface rounded-md shadow-lg py-1 z-50 border border-gray-200">
                                            {user.subscription.status === SubscriptionStatus.PENDING && (
                                                <button 
                                                    onClick={() => handleApprove(user.id)}
                                                    disabled={approvingId === user.id}
                                                    className="block w-full text-left px-4 py-2 text-sm text-text-DEFAULT hover:bg-surface-light disabled:opacity-50"
                                                >
                                                    {t('action_approve')}
                                                </button>
                                            )}
                                            <button onClick={() => openEditModal(user)} className="block w-full text-left px-4 py-2 text-sm text-text-DEFAULT hover:bg-surface-light">{t('action_edit')}</button>
                                            <button onClick={() => openChangePasswordModal(user)} className="block w-full text-left px-4 py-2 text-sm text-text-DEFAULT hover:bg-surface-light">{t('action_change_password')}</button>
                                            {user.subscription.paymentScreenshot && (
                                                <button onClick={() => setPaymentScreenshot(user.subscription.paymentScreenshot)} className="block w-full text-left px-4 py-2 text-sm text-text-DEFAULT hover:bg-surface-light">{t('action_view_payment')}</button>
                                            )}
                                            <button onClick={() => openDeleteModal(user)} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">{t('action_delete')}</button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                         {filteredUsers.length === 0 && (<tr><td colSpan={5} className="text-center py-4 text-text-light">{t('admin_users_none_found')}</td></tr>)}
                    </tbody>
                </table>
                <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
};

// Custom type for staged predictions to allow flexible editing
interface StagedPredictionForEdit extends Omit<Prediction, 'id' | 'odds'> {
    tempId: string;
    odds: string;
}

// Prediction Management Component
const PredictionManagement: React.FC<{ refreshHistory: () => void }> = ({ refreshHistory }) => {
    const { t } = useLanguage();
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string>('');
    const [stagedPredictions, setStagedPredictions] = useState<StagedPredictionForEdit[]>([]);
    const [selectedPredictionIds, setSelectedPredictionIds] = useState<Set<string>>(new Set());
    const [isAdding, setIsAdding] = useState(false);
    
    const [manualMatch, setManualMatch] = useState('');
    const [manualLeague, setManualLeague] = useState('');
    const [manualDate, setManualDate] = useState('');
    const [manualTip, setManualTip] = useState('');
    const [manualOdds, setManualOdds] = useState('');
    const [manualStake, setManualStake] = useState('');
    const [manualType, setManualType] = useState<'big' | 'small'>('small');
    const [manualConfidence, setManualConfidence] = useState('');
    const [isAddingManual, setIsAddingManual] = useState(false);
    const [manualError, setManualError] = useState('');

    const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
    const [finalScore, setFinalScore] = useState('');
    const [result, setResult] = useState<PredictionResult>(PredictionResult.PENDING);
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);

    const [stagedCurrentPage, setStagedCurrentPage] = useState(1);
    const [tipFilter, setTipFilter] = useState('');
    const [probMaxFilter, setProbMaxFilter] = useState('');
    const PREDS_PER_PAGE = 35;

    const leagueMapping: { [key: string]: string } = {
        E0: 'Eng Premier League',
        E1: 'Eng Championship',
        E2: 'Eng League 1',
        E3: 'Eng League 2',
        EC: 'Eng Conference',
        SC0: 'Sct Premier League',
        SC1: 'Sct Division 1',
        SC2: 'Sct Division 2',
        SC3: 'Sct Division 3',
        D1: 'Bundesliga',
        D2: 'Bundesliga 2',
        I1: 'Serie A',
        I2: 'Serie B',
        SP1: 'La Liga',
        SP2: 'La Liga Segunda',
        F1: 'Le Championnat',
        F2: 'Fr Division 2',
        N1: 'Eredivisie',
        B1: 'Bel Jupiler League',
        P1: 'Por Liga I',
        T1: 'Tur Futbol Ligi 1',
        G1: 'Greek Ethniki Katigoria'
    };


    const fetchPendingPredictions = useCallback(async () => {
        setLoading(true);
        try {
            const preds = await api.fetchPredictions('pending');
            preds.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setPredictions(preds);
        } catch (error) {
            console.error("Failed to fetch pending predictions:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPendingPredictions();
    }, [fetchPendingPredictions]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadError('');

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            try {
                const lines = text.split('\n').filter(line => line.trim() !== '');
                if (lines.length <= 1) throw new Error("CSV file is empty or has no data rows.");
                
                const headerLine = lines.shift()?.trim();
                if (!headerLine) throw new Error("CSV file is empty or has no header row.");

                const headers = headerLine.split(',').map(h => h.trim());
                const requiredHeaders = ['Team', 'Opponent', 'Div', 'Date', 'Predicted', 'Prob_Max'];
                const optionalHeaders = ['Odds', 'type'];

                const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
                if (missingHeaders.length > 0) {
                    throw new Error(`Invalid CSV headers. Missing required headers: ${missingHeaders.join(', ')}.`);
                }
                const hasOddsHeader = headers.includes('Odds');

                const newPredictions: StagedPredictionForEdit[] = lines.map((line, index) => {
                    const rowNumber = index + 2;
                    const values = line.trim().split(',');
                    const predictionData: any = {};
                    headers.forEach((header, i) => {
                        predictionData[header] = values[i]?.trim();
                    });

                    for (const header of requiredHeaders) {
                        if (!predictionData[header]) {
                            throw new Error(`Missing required value for '${header}' on line ${rowNumber}.`);
                        }
                    }

                    const date = new Date(predictionData.Date);
                    if (isNaN(date.getTime())) {
                        throw new Error(`Invalid 'Date' format on line ${rowNumber}. Please use a valid date format (e.g., YYYY-MM-DD).`);
                    }

                    const probMax = parseFloat(predictionData.Prob_Max);
                    if (isNaN(probMax) || probMax <= 0 || probMax > 1) {
                        throw new Error(`Invalid 'Prob_Max' value on line ${rowNumber}. Must be a number greater than 0 and up to 1.`);
                    }

                    let odds: number;
                    if (hasOddsHeader && predictionData.Odds) {
                        odds = parseFloat(predictionData.Odds);
                        if (isNaN(odds) || odds <= 0) {
                            throw new Error(`Invalid 'Odds' value on line ${rowNumber}. Must be a positive number.`);
                        }
                    } else {
                        odds = 1 / probMax;
                    }

                    const type = predictionData.type?.toLowerCase() === 'big' ? 'big' : 'small';
                    const divCode = predictionData.Div;
                    const leagueName = leagueMapping[divCode] || divCode;

                    return {
                        date: predictionData.Date,
                        league: leagueName,
                        match: `${predictionData.Team} vs ${predictionData.Opponent}`,
                        tip: predictionData.Predicted,
                        odds: odds.toFixed(2),
                        result: PredictionResult.PENDING,
                        type: type,
                        probMax: probMax,
                        tempId: `staged_${Date.now()}_${index}`
                    };
                });
                
                setStagedPredictions(prev => [...prev, ...newPredictions]);
            } catch (error: any) {
                setUploadError(error.message || 'Failed to parse CSV file.');
            } finally {
                setIsUploading(false);
                if (event.target) event.target.value = '';
            }
        };
        reader.onerror = () => {
             setUploadError('Failed to read file.');
             setIsUploading(false);
        };
        reader.readAsText(file);
    };

    const handleOpenUpdateModal = (prediction: Prediction) => {
        setSelectedPrediction(prediction);
        setFinalScore(prediction.finalScore || '');
        setResult(prediction.result === PredictionResult.PENDING ? PredictionResult.WON : prediction.result);
        setIsUpdateModalOpen(true);
    };

    const handleOpenRemoveModal = (prediction: Prediction) => {
        setSelectedPrediction(prediction);
        setIsRemoveModalOpen(true);
    };

    const handleConfirmRemove = async () => {
        if (!selectedPrediction) return;
        setIsSubmittingModal(true);
        await api.deletePrediction(selectedPrediction.id);
        await fetchPendingPredictions();
        setIsSubmittingModal(false);
        setIsRemoveModalOpen(false);
    };
    
    const handleConfirmUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPrediction) return;
        setIsSubmittingModal(true);
        await api.updatePredictionResult(selectedPrediction.id, result, finalScore);
        await fetchPendingPredictions();
        refreshHistory(); // Refresh history as well since an item moved
        setIsSubmittingModal(false);
        setIsUpdateModalOpen(false);
    };
    
    const handleAddSelectedPredictions = async () => {
        if (selectedPredictionIds.size === 0) return;

        const selectedPredictions = stagedPredictions.filter(p => selectedPredictionIds.has(p.tempId));

        // Validation before adding
        const invalidPrediction = selectedPredictions.find(p => {
            const oddsNum = parseFloat(p.odds);
            return isNaN(oddsNum) || oddsNum <= 0;
        });

        if (invalidPrediction) {
            alert(`Invalid odds value "${invalidPrediction.odds}" for match: ${invalidPrediction.match}. Please correct it before adding.`);
            return;
        }

        setIsAdding(true);

        const predictionsToAdd: Omit<Prediction, 'id'>[] = selectedPredictions.map(p => {
            const { tempId, ...rest } = p;
            return {
                ...rest,
                odds: parseFloat(p.odds)
            };
        });

        await api.addPredictions(predictionsToAdd);
        
        setStagedPredictions(prev => prev.filter(p => !selectedPredictionIds.has(p.tempId)));
        setSelectedPredictionIds(new Set());
        
        await fetchPendingPredictions();
        setIsAdding(false);
    };


    const handleAddManualPrediction = async (e: React.FormEvent) => {
        e.preventDefault();
        setManualError('');
        
        if (!manualMatch.trim() || !manualDate || !manualTip.trim() || !manualOdds) {
            setManualError(t('admin_preds_single_error_fields'));
            return;
        }

        const odds = parseFloat(manualOdds);
        if (isNaN(odds) || odds <= 0) {
            setManualError(t('admin_preds_single_error_odds'));
            return;
        }
        
        const confidence = manualType === 'big' ? parseInt(manualConfidence, 10) : undefined;
        if (manualType === 'big' && (confidence === undefined || isNaN(confidence) || confidence < 0 || confidence > 100)) {
            setManualError(t('admin_preds_single_error_confidence'));
            return;
        }
        
        const stake = manualStake ? parseInt(manualStake, 10) : undefined;
        if (stake !== undefined && (isNaN(stake) || stake <= 0)) {
             setManualError(t('admin_preds_single_error_stake'));
            return;
        }

        setIsAddingManual(true);

        const newPrediction: Omit<Prediction, 'id'> = {
            date: manualDate,
            league: manualLeague.trim() || 'N/A',
            match: manualMatch.trim(),
            tip: manualTip.trim(),
            odds: odds,
            result: PredictionResult.PENDING,
            type: manualType,
            confidence: confidence,
            recommendedStake: stake,
        };

        await api.addPredictions([newPrediction]);

        // Reset form and refresh
        setManualMatch('');
        setManualLeague('');
        setManualDate('');
        setManualTip('');
        setManualOdds('');
        setManualStake('');
        setManualType('small');
        setManualConfidence('');
        await fetchPendingPredictions();
        setIsAddingManual(false);
    };
    
    const handleSelectPrediction = (tempId: string) => {
        setSelectedPredictionIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tempId)) {
                newSet.delete(tempId);
            } else {
                newSet.add(tempId);
            }
            return newSet;
        });
    };

    const handleSelectAllStaged = () => {
        const allVisibleIds = paginatedStagedPredictions.map(p => p.tempId);
        const allVisibleAreSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedPredictionIds.has(id));

        if (allVisibleAreSelected) {
            setSelectedPredictionIds(prev => {
                const newSet = new Set(prev);
                allVisibleIds.forEach(id => newSet.delete(id));
                return newSet;
            });
        } else {
            setSelectedPredictionIds(prev => new Set([...prev, ...allVisibleIds]));
        }
    };
    
    const handleDuplicatePrediction = (tempIdToDuplicate: string) => {
        const indexToDuplicate = stagedPredictions.findIndex(p => p.tempId === tempIdToDuplicate);
        if (indexToDuplicate === -1) return;

        const originalPrediction = stagedPredictions[indexToDuplicate];
        const newPrediction = { ...originalPrediction, tempId: `staged_${Date.now()}_${Math.random()}` };
        
        const newPredictions = [...stagedPredictions];
        newPredictions.splice(indexToDuplicate + 1, 0, newPrediction);
        setStagedPredictions(newPredictions);
    };
    
    const handleStagedPredictionChange = (tempId: string, field: 'tip' | 'odds', value: string) => {
        setStagedPredictions(prev => prev.map(p => {
            if (p.tempId === tempId) {
                return { ...p, [field]: value };
            }
            return p;
        }));
    };

    const filteredStagedPredictions = useMemo(() => {
        return stagedPredictions.filter(p => {
            const tipMatch = p.tip.toLowerCase().includes(tipFilter.toLowerCase());
            const probMaxNum = parseFloat(probMaxFilter);
            const probMaxMatch = isNaN(probMaxNum) || (p.probMax !== undefined && p.probMax >= probMaxNum);
            return tipMatch && probMaxMatch;
        });
    }, [stagedPredictions, tipFilter, probMaxFilter]);

    const totalStagedPages = Math.ceil(filteredStagedPredictions.length / PREDS_PER_PAGE);

    const paginatedStagedPredictions = useMemo(() => {
        return filteredStagedPredictions.slice((stagedCurrentPage - 1) * PREDS_PER_PAGE, stagedCurrentPage * PREDS_PER_PAGE);
    }, [filteredStagedPredictions, stagedCurrentPage]);

    const areAllVisibleStagedSelected = paginatedStagedPredictions.length > 0 && paginatedStagedPredictions.every(p => selectedPredictionIds.has(p.tempId));

    const commonThClasses = "px-4 py-3 text-left text-xs font-semibold text-text-dark uppercase";
    const commonTdClasses = "px-4 py-3 whitespace-nowrap text-sm";
    const inputClasses = "block w-full px-3 py-2 bg-surface border border-gray-300 rounded-md shadow-sm placeholder-text-dark focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";
    
    return (
        <div className="space-y-8">
             <ActionModal isOpen={isUpdateModalOpen} onClose={() => setIsUpdateModalOpen(false)} title={t('modal_update_result_title')}>
                <form onSubmit={handleConfirmUpdate}>
                    <p className="text-sm text-text-light mb-4">{selectedPrediction?.match}</p>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="finalScore" className="block text-sm font-medium text-text-light">{t('modal_update_result_score_label')}</label>
                            <input type="text" id="finalScore" value={finalScore} onChange={e => setFinalScore(e.target.value)} className={inputClasses} />
                        </div>
                        <div>
                            <label htmlFor="result" className="block text-sm font-medium text-text-light">{t('modal_update_result_result_label')}</label>
                            <select id="result" value={result} onChange={e => setResult(e.target.value as PredictionResult)} required className={inputClasses}>
                                <option value={PredictionResult.WON}>{t('result_won')}</option>
                                <option value={PredictionResult.LOSS}>{t('result_loss')}</option>
                                <option value={PredictionResult.RETURN}>{t('result_return')}</option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={() => setIsUpdateModalOpen(false)} className="bg-surface-light text-text-light px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200">{t('cancel')}</button>
                        <button type="submit" disabled={isSubmittingModal} className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark disabled:bg-gray-300 flex items-center">{isSubmittingModal && <SpinnerIcon className="w-4 h-4 mr-2"/>}{t('save_changes')}</button>
                    </div>
                </form>
            </ActionModal>

            <ActionModal isOpen={isRemoveModalOpen} onClose={() => setIsRemoveModalOpen(false)} title={t('modal_delete_prediction_title')}>
                <p>{t('modal_delete_prediction_confirm_text')}</p>
                <div className="mt-6 flex justify-end space-x-3">
                    <button type="button" onClick={() => setIsRemoveModalOpen(false)} className="bg-surface-light text-text-light px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200">{t('cancel')}</button>
                    <button onClick={handleConfirmRemove} disabled={isSubmittingModal} className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:bg-gray-300 flex items-center">{isSubmittingModal && <SpinnerIcon className="w-4 h-4 mr-2"/>}{t('confirm_remove')}</button>
                </div>
            </ActionModal>
            
            {/* Add Predictions Section */}
            <div>
                <h3 className="text-xl font-semibold mb-4">{t('admin_preds_add_title')}</h3>
                <div className="bg-surface border border-gray-200 shadow-lg rounded-lg p-6 space-y-6">
                     <div>
                        <h4 className="text-lg font-medium mb-2">{t('admin_preds_csv_title')}</h4>
                        <p className="text-text-light mb-2 text-sm">{t('admin_preds_csv_desc')}</p>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                            className="block w-full text-sm text-text-dark file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                        {isUploading && <div className="flex items-center text-sm text-primary mt-2"><SpinnerIcon className="w-4 h-4 mr-2" />{t('admin_preds_csv_processing')}</div>}
                        {uploadError && <p className="text-sm text-red-500 mt-2">{uploadError}</p>}
                    </div>

                    <hr className="border-gray-200" />
                    
                    <div>
                        <h4 className="text-lg font-medium mb-3">{t('admin_preds_single_title')}</h4>
                        <form onSubmit={handleAddManualPrediction} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label htmlFor="manualMatch" className="block text-sm font-medium text-text-light">{t('admin_preds_single_match')}</label>
                                    <input type="text" id="manualMatch" value={manualMatch} onChange={e => setManualMatch(e.target.value)} required className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor="manualLeague" className="block text-sm font-medium text-text-light">{t('admin_preds_single_league')}</label>
                                    <input type="text" id="manualLeague" value={manualLeague} onChange={e => setManualLeague(e.target.value)} className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor="manualDate" className="block text-sm font-medium text-text-light">{t('admin_preds_single_date')}</label>
                                    <input type="date" id="manualDate" value={manualDate} onChange={e => setManualDate(e.target.value)} required className={inputClasses} />
                                </div>
                                 <div>
                                    <label htmlFor="manualTip" className="block text-sm font-medium text-text-light">{t('admin_preds_single_tip')}</label>
                                    <input type="text" id="manualTip" value={manualTip} onChange={e => setManualTip(e.target.value)} required className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor="manualOdds" className="block text-sm font-medium text-text-light">{t('admin_preds_single_odds')}</label>
                                    <input type="number" step="0.01" id="manualOdds" value={manualOdds} onChange={e => setManualOdds(e.target.value)} required className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor="manualStake" className="block text-sm font-medium text-text-light">{t('admin_preds_single_stake')}</label>
                                    <input type="number" step="1" id="manualStake" value={manualStake} onChange={e => setManualStake(e.target.value)} placeholder={t('admin_preds_single_stake_placeholder')} className={inputClasses} />
                                </div>
                                <div>
                                    <label htmlFor="manualType" className="block text-sm font-medium text-text-light">{t('admin_preds_single_type')}</label>
                                    <select id="manualType" value={manualType} onChange={e => setManualType(e.target.value as 'big' | 'small')} className={inputClasses}>
                                        <option value="small">{t('admin_preds_single_type_small')}</option>
                                        <option value="big">{t('admin_preds_single_type_big')}</option>
                                    </select>
                                </div>
                                {manualType === 'big' && (
                                    <div className="md:col-span-2">
                                        <label htmlFor="manualConfidence" className="block text-sm font-medium text-text-light">{t('admin_preds_single_confidence')}</label>
                                        <input type="number" min="0" max="100" id="manualConfidence" value={manualConfidence} onChange={e => setManualConfidence(e.target.value)} className={inputClasses} />
                                    </div>
                                )}
                            </div>
                            {manualError && <p className="text-red-500 text-sm mt-2">{manualError}</p>}
                            <div className="flex justify-end pt-2">
                                <button type="submit" disabled={isAddingManual} className="bg-secondary text-white px-4 py-2 rounded text-sm hover:bg-secondary-dark disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center w-40">
                                    {isAddingManual ? <><SpinnerIcon className="w-4 h-4 mr-2" /> {t('admin_preds_single_add_button_loading')}</> : t('admin_preds_single_add_button')}
                                </button>
                            </div>
                        </form>
                    </div>

                </div>
            </div>

            {/* Staged Predictions */}
            {stagedPredictions.length > 0 && (
                <div>
                    <h3 className="text-xl font-semibold mb-4">{t('admin_preds_staged_title')} ({stagedPredictions.length})</h3>
                    <div className="mb-4 flex flex-col md:flex-row gap-4">
                        <input type="text" placeholder={t('admin_preds_staged_filter_tip_placeholder')} value={tipFilter} onChange={e => setTipFilter(e.target.value)} className={inputClasses} />
                        <input type="number" placeholder={t('admin_preds_staged_filter_prob_max_placeholder')} value={probMaxFilter} onChange={e => setProbMaxFilter(e.target.value)} className={inputClasses} />
                    </div>
                    <div className="bg-surface border border-gray-200 shadow-lg rounded-lg overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-surface-light">
                                <tr>
                                    <th scope="col" className={commonThClasses}>
                                        <input type="checkbox" onChange={handleSelectAllStaged} checked={areAllVisibleStagedSelected} className="rounded border-gray-300 text-primary focus:ring-primary"/>
                                    </th>
                                    <th scope="col" className={commonThClasses}>{t('admin_preds_staged_date')}</th>
                                    <th scope="col" className={commonThClasses}>{t('admin_preds_staged_league')}</th>
                                    <th scope="col" className={commonThClasses}>{t('admin_preds_staged_match')}</th>
                                    <th scope="col" className={commonThClasses}>{t('admin_preds_staged_tip')}</th>
                                    <th scope="col" className={commonThClasses}>{t('admin_preds_staged_odds')}</th>
                                    <th scope="col" className={commonThClasses}>{t('admin_preds_staged_prob_max')}</th>
                                    <th scope="col" className={commonThClasses}>{t('admin_preds_staged_actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface divide-y divide-gray-200">
                                {paginatedStagedPredictions.map((p) => (
                                    <tr key={p.tempId} className="hover:bg-surface-light transition-colors">
                                        <td className={commonTdClasses}>
                                            <input type="checkbox" checked={selectedPredictionIds.has(p.tempId)} onChange={() => handleSelectPrediction(p.tempId)} className="rounded border-gray-300 text-primary focus:ring-primary"/>
                                        </td>
                                        <td className={commonTdClasses}>{p.date}</td>
                                        <td className={commonTdClasses}>{p.league}</td>
                                        <td className={commonTdClasses}>{p.match}</td>
                                        <td className={`${commonTdClasses} w-48`}>
                                            <input type="text" value={p.tip} onChange={(e) => handleStagedPredictionChange(p.tempId, 'tip', e.target.value)} className="w-full bg-transparent border-b border-gray-300 focus:border-primary focus:outline-none"/>
                                        </td>
                                        <td className={`${commonTdClasses} w-24`}>
                                            <input type="text" value={p.odds} onChange={(e) => handleStagedPredictionChange(p.tempId, 'odds', e.target.value)} className="w-full bg-transparent border-b border-gray-300 focus:border-primary focus:outline-none"/>
                                        </td>
                                        <td className={`${commonTdClasses} font-semibold`}>{p.probMax?.toFixed(4)}</td>
                                        <td className={commonTdClasses}>
                                            <button onClick={() => handleDuplicatePrediction(p.tempId)} className="text-xs bg-sky-100 text-sky-800 hover:bg-sky-200 px-2 py-1 rounded">{t('admin_preds_staged_duplicate')}</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <PaginationControls currentPage={stagedCurrentPage} totalPages={totalStagedPages} onPageChange={setStagedCurrentPage} />
                        <div className="p-4 flex justify-end items-center space-x-4 bg-surface-light border-t border-gray-200">
                             <button onClick={() => setStagedPredictions([])} className="bg-gray-200 text-text-light px-4 py-2 rounded text-sm hover:bg-gray-300">
                                {t('admin_preds_staged_clear')}
                            </button>
                            <button onClick={handleAddSelectedPredictions} disabled={isAdding || selectedPredictionIds.size === 0} className="bg-primary text-white px-4 py-2 rounded text-sm hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center w-40">
                                {isAdding ? <><SpinnerIcon className="w-4 h-4 mr-2" /> {t('admin_preds_single_add_button_loading')}</> : `${t('admin_preds_staged_add_selected')} (${selectedPredictionIds.size})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Predictions */}
            <div>
                 <h3 className="text-xl font-semibold mb-4">{t('admin_preds_pending_title')} ({predictions.length})</h3>
                 <div className="bg-surface border border-gray-200 shadow-lg rounded-lg overflow-x-auto">
                     <table className="min-w-full">
                         <thead className="bg-surface-light">
                            <tr>
                                <th className={commonThClasses}>{t('admin_preds_staged_match')}</th>
                                <th className={commonThClasses}>{t('admin_preds_staged_tip')}</th>
                                <th className={commonThClasses}>{t('admin_preds_staged_odds')}</th>
                                <th className={commonThClasses}>{t('admin_preds_pending_actions')}</th>
                            </tr>
                        </thead>
                         <tbody className="bg-surface divide-y divide-gray-200">
                             {loading ? (
                                <tr><td colSpan={4} className="text-center py-4"><SpinnerIcon className="w-6 h-6 mx-auto text-primary"/></td></tr>
                             ) : predictions.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-4 text-text-light">{t('admin_preds_pending_none')}</td></tr>
                             ) : (
                                predictions.map(p => (
                                    <tr key={p.id} className="hover:bg-surface-light transition-colors">
                                        <td className={commonTdClasses}>{p.match}</td>
                                        <td className={commonTdClasses}>{p.tip}</td>
                                        <td className={`${commonTdClasses} font-semibold text-accent-dark`}>{isFinite(p.odds) ? p.odds.toFixed(2) : 'N/A'}</td>
                                        <td className={commonTdClasses}>
                                            <div className="flex space-x-2">
                                                <button onClick={() => handleOpenUpdateModal(p)} className="text-xs bg-sky-100 text-sky-800 hover:bg-sky-200 px-2 py-1 rounded">{t('action_update')}</button>
                                                <button onClick={() => handleOpenRemoveModal(p)} className="text-xs bg-red-100 text-red-800 hover:bg-red-200 px-2 py-1 rounded">{t('action_remove')}</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                             )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const PredictionHistory: React.FC<{ refreshCounter: number, onRefresh: () => void }> = ({ refreshCounter, onRefresh }) => {
    const { t } = useLanguage();
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const PREDS_PER_PAGE = 10;
    
    const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [finalScore, setFinalScore] = useState('');
    const [result, setResult] = useState<PredictionResult>(PredictionResult.WON);
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.fetchPredictions('history');
            data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setPredictions(data);
        } catch (error) {
            console.error("Failed to fetch prediction history:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory, refreshCounter]);
    
    const handleOpenEditModal = (prediction: Prediction) => {
        setSelectedPrediction(prediction);
        setFinalScore(prediction.finalScore || '');
        setResult(prediction.result);
        setIsEditModalOpen(true);
    };

    const handleConfirmEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPrediction) return;
        setIsSubmittingModal(true);
        await api.updatePredictionResult(selectedPrediction.id, result, finalScore);
        await fetchHistory();
        onRefresh(); // Trigger refresh of pending list
        setIsSubmittingModal(false);
        setIsEditModalOpen(false);
    };

    const totalPages = Math.ceil(predictions.length / PREDS_PER_PAGE);
    const paginatedPredictions = predictions.slice((currentPage - 1) * PREDS_PER_PAGE, currentPage * PREDS_PER_PAGE);

    const translateResult = (result: PredictionResult) => {
        const key = `result_${result.toLowerCase()}` as any;
        return t(key);
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

    const commonThClasses = "px-4 py-3 text-left text-xs font-semibold text-text-dark uppercase";
    const commonTdClasses = "px-4 py-3 whitespace-nowrap text-sm";
    const inputClasses = "block w-full px-3 py-2 bg-surface border border-gray-300 rounded-md shadow-sm placeholder-text-dark focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";

    if (loading) {
        return (
            <div className="text-center py-8">
                <SpinnerIcon className="w-8 h-8 mx-auto text-primary" />
                <p className="mt-2 text-text-light">{t('admin_history_loading')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
             <ActionModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={t('action_edit_result')}>
                <form onSubmit={handleConfirmEdit}>
                    <p className="text-sm text-text-light mb-4">{selectedPrediction?.match}</p>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="editFinalScore" className="block text-sm font-medium text-text-light">{t('modal_update_result_score_label')}</label>
                            <input type="text" id="editFinalScore" value={finalScore} onChange={e => setFinalScore(e.target.value)} className={inputClasses} />
                        </div>
                        <div>
                            <label htmlFor="editResult" className="block text-sm font-medium text-text-light">{t('modal_update_result_result_label')}</label>
                            <select id="editResult" value={result} onChange={e => setResult(e.target.value as PredictionResult)} required className={inputClasses}>
                                <option value={PredictionResult.WON}>{t('result_won')}</option>
                                <option value={PredictionResult.LOSS}>{t('result_loss')}</option>
                                <option value={PredictionResult.RETURN}>{t('result_return')}</option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={() => setIsEditModalOpen(false)} className="bg-surface-light text-text-light px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-200">{t('cancel')}</button>
                        <button type="submit" disabled={isSubmittingModal} className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark disabled:bg-gray-300 flex items-center">{isSubmittingModal && <SpinnerIcon className="w-4 h-4 mr-2"/>}{t('save_changes')}</button>
                    </div>
                </form>
            </ActionModal>
            <h3 className="text-xl font-semibold">{t('admin_history_title')} ({predictions.length})</h3>
            <div className="bg-surface border border-gray-200 shadow-lg rounded-lg overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-surface-light">
                        <tr>
                            <th className={commonThClasses}>{t('admin_history_table_date')}</th>
                            <th className={commonThClasses}>{t('admin_history_table_match')}</th>
                            <th className={commonThClasses}>{t('admin_history_table_score')}</th>
                            <th className={commonThClasses}>{t('admin_history_table_result')}</th>
                            <th className={commonThClasses}>{t('admin_history_table_actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-surface divide-y divide-gray-200">
                        {paginatedPredictions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-4 text-text-light">{t('admin_history_none')}</td>
                            </tr>
                        ) : (
                            paginatedPredictions.map(p => (
                                <tr key={p.id} className="hover:bg-surface-light transition-colors">
                                    <td className={commonTdClasses}>{p.date}</td>
                                    <td className={`${commonTdClasses} text-text-DEFAULT font-medium`}>{p.match}</td>
                                    <td className={`${commonTdClasses} font-bold`}>{p.finalScore || '-'}</td>
                                    <td className={commonTdClasses}>
                                        <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getResultColor(p.result)}`}>
                                            {translateResult(p.result)}
                                        </span>
                                    </td>
                                    <td className={commonTdClasses}>
                                        <button onClick={() => handleOpenEditModal(p)} className="text-xs bg-gray-100 text-gray-800 hover:bg-gray-200 px-2 py-1 rounded">{t('action_edit_result')}</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
};


const SettingsManagement: React.FC = () => {
    const { settings, refreshSettings } = useSettings();
    const { t } = useLanguage();
    const [pageTitle, setPageTitle] = useState('');
    const [logo, setLogo] = useState<string | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    const [leagues, setLeagues] = useState<League[]>([]);
    const [newLeagueName, setNewLeagueName] = useState('');
    const [newLeagueLogo, setNewLeagueLogo] = useState<string | null>(null); // For base64 upload
    const [newLeagueUrl, setNewLeagueUrl] = useState(''); // For URL input
    const [logoInputMethod, setLogoInputMethod] = useState<'upload' | 'url'>('upload');
    
    useEffect(() => {
        if (settings) {
            setPageTitle(settings.pageTitle);
            setLogo(settings.logoUrl);
            setLogoPreview(settings.logoUrl);
            setLeagues(settings.supportedLeagues || []);
        }
    }, [settings]);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setLogo(base64String);
                setLogoPreview(base64String);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleNewLeagueLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setNewLeagueLogo(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddLeague = () => {
        const logoSource = logoInputMethod === 'upload' ? newLeagueLogo : newLeagueUrl.trim();
        if (newLeagueName.trim() && logoSource) {
            setLeagues(prev => [...prev, { name: newLeagueName.trim(), logoUrl: logoSource }]);
            // Reset form
            setNewLeagueName('');
            setNewLeagueLogo(null);
            setNewLeagueUrl('');
            setLogoInputMethod('upload');
            const fileInput = document.getElementById('newLeagueLogo') as HTMLInputElement;
            if(fileInput) fileInput.value = '';
        }
    };

    const handleRemoveLeague = (leagueName: string) => {
        setLeagues(prev => prev.filter(l => l.name !== leagueName));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage('');
        try {
            await api.updateSettings({ pageTitle, logoUrl: logo, supportedLeagues: leagues });
            await refreshSettings();
            setSaveMessage(t('admin_settings_save_success'));
        } catch (error) {
            console.error("Failed to save settings:", error);
            setSaveMessage("Failed to save settings.");
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveMessage(''), 3000);
        }
    };

    const inputClasses = "mt-1 block w-full px-3 py-2 bg-surface-light border border-gray-300 rounded-md shadow-sm placeholder-text-dark focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";
    const fileInputClasses = "block w-full text-sm text-text-dark file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20";
    
    const newLeagueLogoPreview = logoInputMethod === 'upload' ? newLeagueLogo : newLeagueUrl;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-surface border border-gray-200 p-8 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold">{t('admin_settings_title')}</h3>
                <div className="mt-6 space-y-6">
                    <div>
                        <label htmlFor="pageTitle" className="block text-sm font-medium text-text-DEFAULT">{t('admin_settings_pageTitle')}</label>
                        <input type="text" id="pageTitle" value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} className={inputClasses} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-DEFAULT">{t('admin_settings_logo')}</label>
                        <div className="mt-1 flex items-center space-x-6">
                            <div className="shrink-0">
                                {logoPreview ? <img src={logoPreview} alt="Logo preview" className="h-16 w-16 object-contain rounded-md bg-surface-light p-1 border border-gray-200"/> : <div className="h-16 w-16 bg-surface-light rounded-md flex items-center justify-center text-text-dark text-xs text-center">{t('admin_settings_logo_noLogo')}</div>}
                            </div>
                            <label className="block">
                                <span className="sr-only">{t('admin_settings_logo_choose')}</span>
                                <input type="file" onChange={handleLogoChange} accept="image/png, image/jpeg, image/svg+xml" className={fileInputClasses}/>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="bg-surface border border-gray-200 p-8 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold">{t('admin_settings_leagues_title')}</h3>
                <p className="text-sm text-text-light mt-1 mb-6">{t('admin_settings_leagues_desc')}</p>
                <div className="space-y-4 p-4 border border-dashed rounded-lg bg-background">
                     <div className="flex items-center space-x-6">
                        <label className="flex items-center">
                            <input type="radio" name="logoInputMethod" value="upload" checked={logoInputMethod === 'upload'} onChange={() => setLogoInputMethod('upload')} className="h-4 w-4 text-primary focus:ring-primary border-gray-300"/>
                            <span className="ml-2 text-sm font-medium text-text-DEFAULT">{t('admin_settings_leagues_logo_upload')}</span>
                        </label>
                         <label className="flex items-center">
                            <input type="radio" name="logoInputMethod" value="url" checked={logoInputMethod === 'url'} onChange={() => setLogoInputMethod('url')} className="h-4 w-4 text-primary focus:ring-primary border-gray-300"/>
                            <span className="ml-2 text-sm font-medium text-text-DEFAULT">{t('admin_settings_leagues_logo_url')}</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="md:col-span-1">
                            <label htmlFor="newLeagueName" className="block text-sm font-medium text-text-DEFAULT">{t('admin_settings_leagues_name')}</label>
                            <input type="text" id="newLeagueName" value={newLeagueName} onChange={e => setNewLeagueName(e.target.value)} className={inputClasses}/>
                        </div>
                        <div className="md:col-span-2">
                            {logoInputMethod === 'upload' ? (
                                <>
                                    <label htmlFor="newLeagueLogo" className="block text-sm font-medium text-text-DEFAULT">{t('admin_settings_leagues_logo')}</label>
                                    <div className="flex items-center space-x-4 mt-1">
                                        {newLeagueLogoPreview && <img src={newLeagueLogoPreview} alt="New league logo preview" className="h-10 w-10 object-contain rounded-md bg-surface p-1 border border-gray-200"/>}
                                        <input type="file" id="newLeagueLogo" onChange={handleNewLeagueLogoChange} accept="image/png, image/jpeg, image/svg+xml" className={fileInputClasses}/>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <label htmlFor="newLeagueUrl" className="block text-sm font-medium text-text-DEFAULT">{t('admin_settings_leagues_logo_url_label')}</label>
                                    <div className="flex items-center space-x-4">
                                        {newLeagueLogoPreview && <img src={newLeagueLogoPreview} alt="New league URL preview" className="h-10 w-10 object-contain rounded-md bg-surface p-1 border border-gray-200"/>}
                                        <input type="url" id="newLeagueUrl" value={newLeagueUrl} onChange={e => setNewLeagueUrl(e.target.value)} placeholder={t('admin_settings_leagues_logo_url_placeholder')} className={inputClasses}/>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={handleAddLeague} disabled={!newLeagueName.trim() || (logoInputMethod === 'upload' ? !newLeagueLogo : !newLeagueUrl.trim())} className="bg-secondary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-secondary-dark disabled:bg-gray-300">
                           {t('admin_settings_leagues_add_button')}
                        </button>
                    </div>
                </div>
                
                <div className="mt-6">
                    <h4 className="text-lg font-medium mb-2">{t('admin_settings_leagues_current')}</h4>
                    {leagues.length > 0 ? (
                        <ul className="space-y-2">
                            {leagues.map(league => (
                                <li key={league.name} className="flex items-center justify-between p-2 bg-surface-light rounded-md border border-gray-200">
                                    <div className="flex items-center space-x-3">
                                        <img src={league.logoUrl} alt={league.name} className="h-8 w-8 object-contain rounded-sm"/>
                                        <span className="font-medium text-text-DEFAULT">{league.name}</span>
                                    </div>
                                    <button onClick={() => handleRemoveLeague(league.name)} className="text-red-500 hover:text-red-700">
                                        <XCircleIcon className="w-5 h-5"/>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-text-light text-center py-4">{t('admin_settings_leagues_no_leagues')}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-4">
                {saveMessage && <p className="text-sm text-green-600">{saveMessage}</p>}
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-primary text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center w-40"
                >
                    {isSaving ? <><SpinnerIcon className="w-4 h-4 mr-2" /> {t('admin_settings_save_button_loading')}</> : t('admin_settings_save_button')}
                </button>
            </div>
        </div>
    );
};


// Main Dashboard Component
const AdminDashboardPage: React.FC = () => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'users' | 'predictions' | 'settings' | 'history'>('users');
    const [users, setUsers] = useState<User[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [historyRefreshCounter, setHistoryRefreshCounter] = useState(0);

    const fetchAllUsers = useCallback(async () => {
        setLoadingData(true);
        try {
            const allUsers = await api.fetchAllUsers();
            setUsers(allUsers.filter(u => u.role === 'user'));
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setLoadingData(false);
        }
    }, []);

    const triggerHistoryRefresh = () => {
        setHistoryRefreshCounter(c => c + 1);
    };

    useEffect(() => {
        if(activeTab === 'users') {
            fetchAllUsers();
        }
    }, [activeTab, fetchAllUsers]);

    const TabButton: React.FC<{ tab: 'users' | 'predictions' | 'settings' | 'history', children: React.ReactNode }> = ({ tab, children }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab ? 'bg-primary text-white shadow-md' : 'text-text-light hover:bg-surface-light'}`}
        >
            {children}
        </button>
    );

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">{t('admin_title')}</h1>
            <div className="flex space-x-2 mb-6 border-b border-gray-200 pb-3">
                <TabButton tab="users">{t('admin_tabs_users')}</TabButton>
                <TabButton tab="predictions">{t('admin_tabs_predictions')}</TabButton>
                <TabButton tab="history">{t('admin_tabs_history')}</TabButton>
                <TabButton tab="settings">{t('admin_tabs_settings')}</TabButton>
            </div>

            <div>
                {activeTab === 'users' && (
                    loadingData ? (
                         <div className="text-center py-8">
                            <SpinnerIcon className="w-8 h-8 mx-auto text-primary" />
                            <p className="mt-2 text-text-light">{t('admin_loading_users')}</p>
                        </div>
                    ) : (
                         <UserManagement users={users} refreshUsers={fetchAllUsers} />
                    )
                )}
                {activeTab === 'predictions' && <PredictionManagement refreshHistory={triggerHistoryRefresh} />}
                {activeTab === 'history' && <PredictionHistory refreshCounter={historyRefreshCounter} onRefresh={triggerHistoryRefresh} />}
                {activeTab === 'settings' && <SettingsManagement />}
            </div>
        </div>
    );
};

export default AdminDashboardPage;
