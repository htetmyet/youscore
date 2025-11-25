import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { SubscriptionPlan, SubscriptionStatus } from '../types';
import { UploadCloudIcon, CheckCircleIcon, AlertTriangleIcon, SpinnerIcon, BankIcon, CryptoIcon } from '../components/icons';
import { useLanguage, useSettings } from '../App';

const SubscriptionPage: React.FC = () => {
    const { user, updateUserSubscription } = useAuth();
    const { t } = useLanguage();
    const { settings } = useSettings();
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(SubscriptionPlan.NONE);
    const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const bankAccounts = settings?.bankAccounts || [];
    const cryptoWallets = settings?.cryptoWallets || [];
    const weeklyPriceLabel = settings?.subscriptionPrices?.weekly?.trim() || t('sub_plan_weekly_price');
    const monthlyPriceLabel = settings?.subscriptionPrices?.monthly?.trim() || t('sub_plan_monthly_price');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPaymentScreenshot(reader.result as string);
                setFileName(file.name);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = async () => {
        if (!user || selectedPlan === SubscriptionPlan.NONE || !paymentScreenshot) {
            setError(t('sub_error_form'));
            return;
        }
        setError('');
        setLoading(true);
        await updateUserSubscription(user.id, selectedPlan, paymentScreenshot);
        setLoading(false);
    };
    
    if (!user) return null;

    if (user.subscription.status === SubscriptionStatus.PENDING) {
        return (
            <div className="max-w-2xl mx-auto text-center bg-surface border border-gray-200 p-8 rounded-lg shadow-lg">
                <CheckCircleIcon className="w-16 h-16 text-primary mx-auto mb-4"/>
                <h2 className="text-2xl font-bold mb-2">{t('sub_pending_title')}</h2>
                <p className="text-text-light">{t('sub_pending_desc')}</p>
            </div>
        );
    }

    const PlanCard = ({ plan, title, price, priceDesc, description, features, isBestValue = false }: {
        plan: SubscriptionPlan,
        title: string,
        price: string,
        priceDesc: string,
        description: string,
        features: string[],
        isBestValue?: boolean
    }) => {
        const isSelected = selectedPlan === plan;
        return (
            <div 
                onClick={() => setSelectedPlan(plan)} 
                className={`bg-surface p-6 rounded-xl cursor-pointer transition-all border relative shadow-lg hover:shadow-xl hover:-translate-y-1 ${isSelected ? 'border-primary ring-2 ring-primary ring-offset-4 ring-offset-background' : 'border-gray-200'}`}
            >
                {isBestValue && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-accent to-amber-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">{t('sub_bestValue')}</div>}
                {isSelected && <CheckCircleIcon className="w-6 h-6 text-white bg-primary rounded-full p-1 absolute -top-3 -right-3 shadow-lg" />}
                <h3 className="text-2xl font-bold">{title}</h3>
                <p className="text-4xl font-extrabold my-4">{price}<span className="text-lg font-normal text-text-light">{priceDesc}</span></p>
                <p className="text-text-light mb-4 text-sm">{description}</p>
                <ul className="space-y-2 text-text-light">
                    {features.map((feature, i) => (
                        <li key={i} className="flex items-center"><CheckCircleIcon className="w-5 h-5 text-primary mr-2 flex-shrink-0"/> {feature}</li>
                    ))}
                </ul>
            </div>
        );
    };


    return (
        <div className="max-w-4xl mx-auto">
             {user.subscription.status === SubscriptionStatus.EXPIRED && (
                <div className="max-w-2xl mx-auto text-center bg-accent/10 border border-accent/20 text-accent p-6 rounded-lg shadow-lg mb-8">
                    <AlertTriangleIcon className="w-12 h-12 text-accent mx-auto mb-4"/>
                    <h2 className="text-2xl font-bold mb-2">{t('sub_expired_title')}</h2>
                    <p>{t('sub_expired_desc')}</p>
                </div>
            )}
            <h1 className="text-3xl font-bold text-center mb-2">{t('sub_choosePlan_title')}</h1>
            <p className="text-center text-text-light mb-8">{t('sub_choosePlan_desc')}</p>
            
            <div className="grid md:grid-cols-2 gap-8 mb-8">
                <PlanCard 
                    plan={SubscriptionPlan.WEEKLY}
                    title={t('sub_plan_weekly')}
                    price={weeklyPriceLabel}
                    priceDesc={t('sub_plan_weekly_priceDesc')}
                    description={t('sub_plan_weekly_desc')}
                    features={[t('sub_feature_allAccess'), t('sub_feature_7days'), t('sub_feature_billedWeekly')]}
                />
                <PlanCard 
                    plan={SubscriptionPlan.MONTHLY}
                    title={t('sub_plan_monthly')}
                    price={monthlyPriceLabel}
                    priceDesc={t('sub_plan_monthly_priceDesc')}
                    description={t('sub_plan_monthly_desc')}
                    features={[t('sub_feature_allAccess'), t('sub_feature_30days'), t('sub_feature_billedMonthly')]}
                    isBestValue
                />
            </div>

            {selectedPlan !== SubscriptionPlan.NONE && (
                <div className="bg-surface border border-gray-200 p-8 rounded-xl shadow-xl mt-8">
                    <h2 className="text-2xl font-bold mb-4">{t('sub_confirmPayment_title')}</h2>
                    <p className="text-text-light mb-6">{t('sub_confirmPayment_desc')}</p>

                    <div className="bg-surface-light p-6 rounded-lg border border-gray-200 mb-8">
                        <h3 className="text-lg font-semibold mb-4 text-text-DEFAULT">{t('sub_paymentInfo_title')}</h3>
                        <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                            <div>
                                <h4 className="font-bold text-md mb-3 flex items-center text-text-DEFAULT"><BankIcon className="w-5 h-5 mr-2 text-primary"/>{t('sub_paymentInfo_bank_title')}</h4>
                                <div className="space-y-4">
                                    {bankAccounts.length > 0 ? (
                                        bankAccounts.map((account, index) => (
                                            <div key={`bank-${index}`} className="p-3 bg-background rounded-md border border-gray-200 text-sm text-text-light">
                                                <p><span className="font-semibold text-text-DEFAULT">{t('sub_paymentInfo_bank_name')}:</span> {account.bankName}</p>
                                                <p><span className="font-semibold text-text-DEFAULT">{t('sub_paymentInfo_bank_acc_number')}:</span> {account.accountNumber}</p>
                                                <p><span className="font-semibold text-text-DEFAULT">{t('sub_paymentInfo_bank_acc_name')}:</span> {account.accountName}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-text-light border border-dashed border-gray-300 rounded-md p-4 text-center">
                                            {t('sub_paymentInfo_bank_empty')}
                                        </p>
                                    )}
                                    <p className="text-sm mt-2"><span className="font-semibold text-text-DEFAULT">{t('sub_paymentInfo_bank_reference')}:</span> {user.email}</p>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-md mb-3 flex items-center text-text-DEFAULT"><CryptoIcon className="w-5 h-5 mr-2 text-accent"/>{t('sub_paymentInfo_crypto_title')}</h4>
                                <div className="space-y-2 text-sm text-text-light break-all">
                                    {cryptoWallets.length > 0 ? (
                                        cryptoWallets.map((wallet, index) => (
                                            <div key={`wallet-${index}`} className="p-3 bg-background rounded-md border border-gray-200 space-y-1">
                                                <p><span className="font-semibold text-text-DEFAULT">{t('sub_paymentInfo_crypto_asset')}:</span> {wallet.asset}</p>
                                                <p><span className="font-semibold text-text-DEFAULT">{t('sub_paymentInfo_crypto_network')}:</span> {wallet.network}</p>
                                                <p className="break-words"><span className="font-semibold text-text-DEFAULT">{t('sub_paymentInfo_crypto_address')}:</span> {wallet.address}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-text-light border border-dashed border-gray-300 rounded-md p-4 text-center">
                                            {t('sub_paymentInfo_crypto_empty')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <h3 className="text-lg font-semibold mb-4 text-text-DEFAULT">{t('sub_upload_title')}</h3>
                    <div>
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-surface rounded-lg font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-surface focus-within:ring-primary">
                            <div className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary transition-colors bg-background">
                                <UploadCloudIcon className="w-12 h-12 text-text-dark"/>
                                <span className="mt-2 block text-sm font-medium text-text-DEFAULT">{fileName || t('sub_upload_cta')}</span>
                                <span className="block text-xs text-text-dark">{t('sub_upload_types')}</span>
                            </div>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*"/>
                        </label>
                    </div>

                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    
                    <button
                        onClick={handleSubmit}
                        disabled={!paymentScreenshot || loading}
                        className="mt-6 w-full bg-primary text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-primary-dark transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                         {loading ? <><SpinnerIcon className="w-5 h-5 mr-2"/> {t('sub_submit_button_loading')}</> : t('sub_submit_button')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default SubscriptionPage;
