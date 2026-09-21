import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  getDocs 
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, UserRole, SubscriptionPlan, SubscriptionStatus, UserSubscription } from '../types';
import { INITIAL_CHARITIES } from './demoData';
import { 
  activateUserSubscription, 
  cancelUserSubscription 
} from './subscriptionService';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  userSubscription: UserSubscription | null;
  loading: boolean;
  isAdmin: boolean;
  isSubscriber: boolean;
  signupWithEmail: (email: string, password: string) => Promise<User>;
  loginWithEmail: (email: string, password: string) => Promise<User>;
  completeOnboarding: (name: string, charityId?: string, charityPercent?: number) => Promise<UserProfile>;
  logout: () => Promise<void>;
  activateSubscription: (plan: SubscriptionPlan) => Promise<{ success: boolean; subscription: UserSubscription; message: string }>;
  cancelSubscription: () => Promise<{ success: boolean; subscription: UserSubscription; message: string }>;
  updateUserSubscription: (status: SubscriptionStatus, plan?: SubscriptionPlan, charityPercent?: number) => Promise<void>;
  updateUserCharity: (charityId: string, percent: number) => Promise<void>;
  updateProfileDetails: (details: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const isAdmin = userProfile?.role === 'admin' || 
    currentUser?.email?.toLowerCase() === 'admin@digitalheroes.co.in' || 
    currentUser?.email?.toLowerCase() === 'ranjanaayush48@gmail.com';
  const isSubscriber = userProfile?.subscriptionStatus === 'active';

  // Seed default charities into Firestore if empty - ONLY for admins
  useEffect(() => {
    const seedCharities = async () => {
      // Only attempt to seed if we are authenticated and confirmed as an admin
      if (!currentUser || !isAdmin) return;
      
      try {
        const charitySnap = await getDocs(collection(db, 'charities'));
        if (charitySnap.empty) {
          for (const charity of INITIAL_CHARITIES) {
            await setDoc(doc(db, 'charities', charity.id), charity);
          }
        }
      } catch (err) {
        console.warn('Charity check/seed note:', err);
      }
    };
    seedCharities();
  }, [currentUser, isAdmin]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const subDocRef = doc(db, 'subscriptions', user.uid);

        // Real-time listener for profile changes
        const unsubProfile = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            setUserProfile(snap.data() as UserProfile);
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        }, (err) => {
          console.error('Profile snapshot error:', err);
          setLoading(false);
        });

        // Real-time listener for subscription record
        const unsubSub = onSnapshot(subDocRef, (snap) => {
          if (snap.exists()) {
            setUserSubscription(snap.data() as UserSubscription);
          } else {
            setUserSubscription(null);
          }
        }, (err) => {
          console.warn('Subscription snapshot notice:', err);
        });

        return () => {
          unsubProfile();
          unsubSub();
        };
      } else {
        setUserProfile(null);
        setUserSubscription(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signupWithEmail = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async (
    name: string,
    charityId = 'charity-fairway-foundation',
    charityPercent = 10
  ): Promise<UserProfile> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Authentication required. Please sign in or create an account first.');
    }

    const email = user.email || '';
    const isDefaultAdmin = (
      email.toLowerCase() === 'admin@digitalheroes.co.in' ||
      email.toLowerCase() === 'ranjanaayush48@gmail.com'
    );
    const role: UserRole = isDefaultAdmin ? 'admin' : 'subscriber';

    const trimmedName = name.trim() || user.displayName || email.split('@')[0] || 'Subscriber';

    if (trimmedName !== user.displayName) {
      try {
        await updateProfile(user, { displayName: trimmedName });
      } catch (err) {
        console.warn('Profile displayName update note:', err);
      }
    }

    const userDocRef = doc(db, 'users', user.uid);
    
    let existingSnap;
    try {
      console.log(`ONBOARDING STEP 1: users/${user.uid} read`);
      existingSnap = await getDoc(userDocRef);
      console.log(`ONBOARDING STEP 1 SUCCESS: Document exists = ${existingSnap.exists()}`);
    } catch (step1Err: any) {
      console.error(`ONBOARDING STEP 1 FAILED:`, step1Err);
      throw step1Err;
    }

    const existingData = existingSnap.exists() ? (existingSnap.data() as Partial<UserProfile>) : {};

    const profileData: UserProfile = {
      uid: user.uid,
      email,
      displayName: trimmedName,
      role: existingData.role || role,
      subscriptionPlan: existingData.subscriptionPlan || 'monthly',
      subscriptionStatus: existingData.subscriptionStatus || (isDefaultAdmin ? 'active' : 'inactive'),
      subscriptionProvider: existingData.subscriptionProvider || 'demo',
      selectedCharityId: charityId || existingData.selectedCharityId || 'charity-fairway-foundation',
      charityContributionPercent: Math.max(10, Number(charityPercent) || 10),
      createdAt: existingData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      console.log(`ONBOARDING STEP 2: users/${user.uid} write (doc exists: ${existingSnap.exists()}, payload uid: ${profileData.uid})`);
      if (existingSnap.exists()) {
        await setDoc(userDocRef, profileData, { merge: true });
      } else {
        await setDoc(userDocRef, profileData);
      }
      console.log(`ONBOARDING STEP 2 SUCCESS`);
    } catch (step2Err: any) {
      console.error(`ONBOARDING STEP 2 FAILED:`, step2Err);
      throw step2Err;
    }

    setUserProfile(profileData);
    return profileData;
  };

  const logout = async () => {
    await fbSignOut(auth);
    setUserProfile(null);
    setUserSubscription(null);
  };

  const activateSubscription = async (plan: SubscriptionPlan) => {
    if (!currentUser) {
      throw new Error('Authentication required.');
    }
    return await activateUserSubscription(currentUser.uid, plan);
  };

  const cancelSubscription = async () => {
    console.log('AuthContext: cancelSubscription called');
    if (!currentUser) {
      console.error('AuthContext: No current user found');
      throw new Error('Authentication required.');
    }
    console.log('AuthContext: Calling cancelUserSubscription for UID:', currentUser.uid);
    const result = await cancelUserSubscription(currentUser.uid);
    console.log('AuthContext: cancelUserSubscription result:', result);
    return result;
  };

  const updateUserSubscription = async (status: SubscriptionStatus, plan?: SubscriptionPlan, charityPercent?: number) => {
    if (!currentUser) return;
    const updates: Partial<UserProfile> = {
      subscriptionStatus: status,
      updatedAt: new Date().toISOString()
    };
    if (plan) {
      updates.subscriptionPlan = plan;
      const days = plan === 'yearly' ? 365 : 30;
      updates.subscriptionRenewalDate = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
    }
    if (charityPercent !== undefined) {
      updates.charityContributionPercent = Math.max(10, charityPercent);
    }
    await updateDoc(doc(db, 'users', currentUser.uid), updates);
  };

  const updateUserCharity = async (charityId: string, percent: number) => {
    if (!currentUser) return;
    await updateDoc(doc(db, 'users', currentUser.uid), {
      selectedCharityId: charityId,
      charityContributionPercent: Math.max(10, percent),
      updatedAt: new Date().toISOString()
    });
  };

  const updateProfileDetails = async (details: Partial<UserProfile>) => {
    if (!currentUser) return;
    await updateDoc(doc(db, 'users', currentUser.uid), {
      ...details,
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      userProfile,
      userSubscription,
      loading,
      isAdmin,
      isSubscriber,
      signupWithEmail,
      loginWithEmail,
      completeOnboarding,
      logout,
      activateSubscription,
      cancelSubscription,
      updateUserSubscription,
      updateUserCharity,
      updateProfileDetails
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
