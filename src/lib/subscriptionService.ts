import { db } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where,
  writeBatch
} from 'firebase/firestore';
import { 
  SubscriptionPlan, 
  SubscriptionStatus, 
  SubscriptionProvider, 
  UserSubscription,
  UserProfile 
} from '../types';

/**
 * Subscription Provider Interface
 * Allows seamless substitution with a real Stripe payment provider in the future
 * without altering UI or business logic.
 */
export interface ISubscriptionProvider {
  providerName: SubscriptionProvider;
  activateSubscription(
    userId: string, 
    plan: SubscriptionPlan
  ): Promise<{ success: boolean; subscription: UserSubscription; message: string }>;
  cancelSubscription(
    userId: string
  ): Promise<{ success: boolean; subscription: UserSubscription; message: string }>;
  getSubscription(
    userId: string
  ): Promise<UserSubscription | null>;
}

/**
 * Calculates accurate calendar renewal date based on plan:
 * Monthly = approximately 1 month from activation (using setMonth)
 * Yearly = approximately 1 year from activation (using setFullYear)
 */
export const calculateRenewalDate = (startDate: Date, plan: SubscriptionPlan): Date => {
  const renewal = new Date(startDate.getTime());
  if (plan === 'yearly') {
    renewal.setFullYear(renewal.getFullYear() + 1);
  } else {
    renewal.setMonth(renewal.getMonth() + 1);
  }
  return renewal;
};

/**
 * RazorpaySubscriptionProvider
 * Real implementation using Razorpay API via secure backend endpoints.
 */
export class RazorpaySubscriptionProvider implements ISubscriptionProvider {
  public readonly providerName: SubscriptionProvider = 'razorpay';

  async activateSubscription(
    userId: string,
    plan: SubscriptionPlan
  ): Promise<{ success: boolean; subscription: UserSubscription; message: string }> {
    // UI layer handles checkout.js directly for security and UX.
    // This method is called by AuthContext but for Razorpay we rely on the webhook/UI.
    throw new Error('Razorpay activation must be initiated via the checkout UI.');
  }

  async cancelSubscription(
    userId: string
  ): Promise<{ success: boolean; subscription: UserSubscription; message: string }> {
    if (!userId) {
      throw new Error('Authentication required to cancel subscription.');
    }

    const response = await fetch('/api/subscriptions/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to cancel Razorpay subscription.');
    }

    return await response.json();
  }

  async getSubscription(userId: string): Promise<UserSubscription | null> {
    if (!userId) return null;
    const subSnap = await getDoc(doc(db, 'subscriptions', userId));
    if (subSnap.exists()) {
      return subSnap.data() as UserSubscription;
    }
    return null;
  }
}

// Active provider instance (now using Razorpay)
export const currentSubscriptionProvider: ISubscriptionProvider = new RazorpaySubscriptionProvider();

/**
 * Service functions called by UI and Auth layer
 */
export const activateUserSubscription = async (
  userId: string, 
  plan: SubscriptionPlan
) => {
  return await currentSubscriptionProvider.activateSubscription(userId, plan);
};

export const cancelUserSubscription = async (userId: string) => {
  console.log('subscriptionService: cancelUserSubscription called for', userId);
  return await currentSubscriptionProvider.cancelSubscription(userId);
};

export const fetchUserSubscription = async (userId: string) => {
  return await currentSubscriptionProvider.getSubscription(userId);
};

/**
 * Fetch all subscriptions for Admin review
 */
export const getAllSubscriptions = async (): Promise<UserSubscription[]> => {
  const subsSnap = await getDocs(collection(db, 'subscriptions'));
  const subs: UserSubscription[] = [];
  subsSnap.forEach(docSnap => {
    subs.push(docSnap.data() as UserSubscription);
  });
  return subs;
};
