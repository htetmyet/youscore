

export enum SubscriptionPlan {
  NONE = 'none',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum SubscriptionStatus {
  INACTIVE = 'inactive',
  PENDING = 'pending',
  ACTIVE = 'active',
  EXPIRED = 'expired',
}

export enum PredictionResult {
  PENDING = 'Pending',
  WON = 'Won',
  LOSS = 'Loss',
  RETURN = 'Return',
}

export enum NotificationType {
  NEW_PREDICTIONS = 'new_predictions',
  SUBSCRIPTION_APPROVED = 'subscription_approved',
  SUBSCRIPTION_EXPIRING = 'subscription_expiring',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  timestamp: string; // ISO string
  isRead: boolean;
}

export interface Subscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string | null;
  expiryDate: string | null;
  paymentScreenshot: string | null; // base64 encoded image
}

export interface User {
  id: string;
  email: string;
  passwordHash: string; // In a real app, this would be a hash
  role: 'user' | 'admin';
  subscription: Subscription;
  devices: string[];
  freeAccess?: {
      midWeekExpires?: string; // ISO string
      weekendExpires?: string; // ISO string
  };
}

export interface Prediction {
  id: string;
  date: string;
  league: string;
  match: string; // e.g., "Team A vs Team B"
  tip: string;
  odds: number;
  result: PredictionResult;
  type: 'big' | 'small';
  confidence?: number; // Optional, for big leagues
  recommendedStake?: number; // In units
  probMax?: number;
  finalScore?: string;
}

export interface League {
  name: string;
  logoUrl: string; // base64 encoded image
}

export interface LandingStatHighlight {
  label: string;
  value: string;
  detail: string;
}

export interface LandingCredibilityPoint {
  title: string;
  description: string;
}

export interface LandingTestimonial {
  quote: string;
  author: string;
  role: string;
}

export interface LandingSections {
  heroTagline: string;
  heroSubtitle: string;
  primaryCta: string;
  secondaryCta: string;
  stats: LandingStatHighlight[];
  credibility: LandingCredibilityPoint[];
  testimonials: LandingTestimonial[];
}

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface CryptoWallet {
  asset: string;
  network: string;
  address: string;
}

export interface SubscriptionPrices {
  weekly: string;
  monthly: string;
}

export interface AppSettings {
  pageTitle: string;
  logoUrl: string | null; // base64 encoded image
  supportedLeagues: League[];
  landingSections: LandingSections;
  bankAccounts: BankAccount[];
  cryptoWallets: CryptoWallet[];
  subscriptionPrices: SubscriptionPrices;
}

export interface WeeklyStat {
    weekIdentifier: string; // e.g., "2024-W28"
    totalStaked: number;
    totalReturned: number;
    profitOrLoss: number;
    roi: number;
    winCount: number;
    lossCount: number;
    returnCount: number;
    startDate: string;
    endDate: string;
}

export type Page = 'home' | 'login' | 'register' | 'predictions' | 'history' | 'subscription' | 'admin' | 'dashboard' | 'account';
