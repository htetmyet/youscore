export type SubscriptionPlan = 'none' | 'weekly' | 'monthly';
export type SubscriptionStatus = 'inactive' | 'pending' | 'active' | 'expired';
export type PredictionResult = 'Pending' | 'Won' | 'Loss' | 'Return';
export type NotificationType = 'new_predictions' | 'subscription_approved' | 'subscription_expiring';

export interface Subscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string | null;
  expiryDate: string | null;
  paymentScreenshot: string | null;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  subscription: Subscription;
  devices: string[];
  freeAccess?: {
    midWeekExpires?: string;
    weekendExpires?: string;
  };
}

export interface Prediction {
  id: string;
  date: string;
  league: string;
  match: string;
  tip: string;
  odds: number;
  result: PredictionResult;
  type: 'big' | 'small';
  confidence?: number;
  recommendedStake?: number;
  probMax?: number;
  finalScore?: string;
}

export interface League {
  name: string;
  logoUrl: string;
}

export interface AppSettings {
  pageTitle: string;
  logoUrl: string | null;
  supportedLeagues: League[];
}

export interface WeeklyStat {
  weekIdentifier: string;
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

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  timestamp: string;
  isRead: boolean;
}
