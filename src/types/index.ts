// Common types for Digital Heroes platform

export type UserRole = 'subscriber' | 'admin';

export type SubscriptionPlan = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'lapsed';
export type SubscriptionProvider = 'demo' | 'stripe' | 'razorpay';

export interface UserSubscription {
  id?: string;
  userId: string;
  plan: SubscriptionPlan;
  provider: SubscriptionProvider;
  status: SubscriptionStatus;
  startedAt: string; // ISO date
  renewalDate: string; // ISO date
  cancelledAt?: string; // ISO date when cancelled
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionRenewalDate?: string; // ISO date
  subscriptionProvider?: SubscriptionProvider;
  selectedCharityId?: string;
  charityContributionPercent: number; // minimum 10%
  handicap?: number;
  homeClub?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GolfScore {
  id: string;
  userId: string;
  score: number; // 1 - 45 Stableford
  date: string; // YYYY-MM-DD (unique per user per date)
  courseName?: string;
  notes?: string;
  createdAt: string;
}

export interface CharityEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
}

export interface Charity {
  id: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  mission: string;
  logoUrl?: string;
  imageUrl?: string;
  featured: boolean;
  totalRaised: number; // cumulative in USD
  supporterCount: number;
  upcomingEvents: CharityEvent[];
  impactMetric?: {
    label: string;
    value: string;
  };
  website?: string;
  createdAt: string;
  updatedAt: string;
}

export type DrawType = '5-number' | '4-number' | '3-number';
export type DrawMethod = 'random' | 'algorithmic';
export type DrawStatus = 'scheduled' | 'simulated' | 'published';

export interface WinnerRecord {
  userId: string;
  userEmail: string;
  userName: string;
  matchType: DrawType;
  matchCount: number;
  matchedNumbers: number[];
  prizeShareAmount: number;
  proofStatus: 'none' | 'pending_review' | 'approved' | 'rejected' | 'Submitted';
  proofUrl?: string; // Legacy field for Storage URL
  proofImageData?: string; // Base64 data URL for Firestore-based fallback
  proofFileName?: string;
  proofContentType?: string;
  proofSubmittedAt?: string; // ISO date
  proofNotes?: string;
  paymentStatus: 'pending' | 'paid';
  paidAt?: string;
}

export interface DrawTierResult {
  matchType: DrawType;
  poolSharePercent: number; // e.g. 40, 35, 25
  allocatedAmount: number;
  rolloverAmount: number; // from previous draw (only for 5-number)
  totalAvailable: number;
  winnersCount: number;
  payoutPerWinner: number;
  winners: WinnerRecord[];
  rolledOverToNext: number; // if 0 winners in 5-number
}

export interface MonthlyDraw {
  id: string;
  month: string; // YYYY-MM
  title: string;
  drawDate: string;
  status: DrawStatus;
  drawMethod: DrawMethod;
  winningNumbers: number[]; // 5 winning numbers in range 1-45
  activeSubscribersCount: number;
  monthlyAllocationPerSub: number; // configurable e.g. $10 or 30% of fee
  totalPrizePool: number;
  jackpotRolloverIn: number;
  jackpotRolloverOut: number;
  tiers: {
    fiveMatch: DrawTierResult;
    fourMatch: DrawTierResult;
    threeMatch: DrawTierResult;
  };
  simulatedAt?: string;
  publishedAt?: string;
  createdAt: string;
}

export interface DonationRecord {
  id: string;
  userId?: string;
  donorName: string;
  donorEmail: string;
  charityId: string;
  charityName: string;
  amount: number;
  message?: string;
  createdAt: string;
  status: 'completed' | 'pending';
}

export interface PlatformConfig {
  subscriptionMonthlyPrice: number; // default $29
  subscriptionYearlyPrice: number; // default $290 (discounted)
  prizePoolAllocationPercent: number; // configurable fixed portion, default 35%
  minCharityPercent: number; // default 10%
  defaultJackpotRollover: number; // carried forward
}
