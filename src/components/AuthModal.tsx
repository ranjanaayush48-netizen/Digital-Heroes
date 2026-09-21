import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { X, User, AlertCircle, ShieldCheck } from 'lucide-react';
import { Charity } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  initialMode: 'login' | 'signup';
  charities: Charity[];
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode,
  charities,
  onClose,
  onSuccess,
}) => {
  const { currentUser, userProfile, signupWithEmail, loginWithEmail, completeOnboarding, logout } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [step, setStep] = useState<'auth' | 'onboarding'>('auth');

  // Auth form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Onboarding form fields
  const [name, setName] = useState('');
  const [selectedCharity, setSelectedCharity] = useState(charities[0]?.id || 'charity-fairway-foundation');
  const [charityPercent, setCharityPercent] = useState<number>(10);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync state when modal opens or auth state changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setMode(initialMode);
      setEmail('');
      setPassword('');
      if (currentUser && !userProfile) {
        setStep('onboarding');
        setName(currentUser.displayName || '');
      } else {
        setStep('auth');
      }
    }
  }, [isOpen, initialMode, currentUser, userProfile]);

  useEffect(() => {
    if (charities.length > 0 && !selectedCharity) {
      setSelectedCharity(charities[0].id);
    }
  }, [charities, selectedCharity]);

  if (!isOpen) return null;

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      let user;
      if (mode === 'signup') {
        user = await signupWithEmail(email.trim(), password.trim());
      } else {
        user = await loginWithEmail(email.trim(), password.trim());
      }

      // Check if user profile already exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userDocRef);

      if (snap.exists() && snap.data()?.selectedCharityId) {
        // Returning user with complete profile
        onSuccess();
        onClose();
      } else {
        // New user or missing charity selection: proceed to onboarding
        setStep('onboarding');
      }
    } catch (err: any) {
      console.error('Auth Error:', err);
      let msg = 'Authentication failed. Please try again.';
      
      // Handle Firebase Auth errors specifically
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please provide a valid email address.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Network error. Please check your connection.';
      } else if (err.message) {
        msg = err.message;
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (charityPercent < 10) {
      setError('Minimum charity contribution is 10%.');
      return;
    }

    setLoading(true);
    try {
      console.log('[AUTH_MODAL] Submitting onboarding registration...');
      await completeOnboarding(name.trim(), selectedCharity, charityPercent);
      console.log('[AUTH_MODAL] completeOnboarding succeeded, executing onSuccess & onClose');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Onboarding submission error:', err);
      setError(err?.message || 'Failed to complete registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0d0b]/80 backdrop-blur-sm animate-fade-in">
      <div 
        id="auth-modal-card"
        className="w-full max-w-md bg-[#161c18] border border-[#2e3d32] rounded-xl shadow-2xl p-6 sm:p-8 text-[#E8EAE6] relative"
      >
        {/* Close Button */}
        <button
          id="close-auth-modal"
          onClick={onClose}
          className="absolute top-5 right-5 text-[#88988c] hover:text-[#f2f6f3] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#203225] border border-[#37543f] text-[#8ce2a3] text-xs font-medium mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{step === 'onboarding' ? 'Subscriber Onboarding' : 'Digital Heroes Secure Access'}</span>
          </div>

          <h2 className="font-serif text-2xl font-bold text-[#F4F6F2]">
            {step === 'onboarding'
              ? 'Complete Your Subscriber Profile'
              : mode === 'login'
              ? 'Sign In to Your Account'
              : 'Join as a Subscriber'}
          </h2>

          <p className="text-xs text-[#8f9f92] mt-1">
            {step === 'onboarding'
              ? 'Confirm your display name, choose your beneficiary charity, and set your contribution percentage.'
              : mode === 'login'
              ? 'Access your performance scores, charity selection, and monthly prize draws.'
              : 'Support vital charities, log golf rounds, and enter community prize pools.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[#301c1c] border border-[#522929] text-xs text-[#f4a7a7] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Email/Password Authentication */}
        {step === 'auth' && (
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#bac5bd] mb-1">
                Email Address
              </label>
              <input
                id="auth-email-input"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#121614] border border-[#2f3d33] rounded-lg text-sm text-[#f1f5f2] placeholder-[#5d6d61] focus:outline-none focus:border-[#528d64] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#bac5bd] mb-1">
                Password
              </label>
              <input
                id="auth-password-input"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#121614] border border-[#2f3d33] rounded-lg text-sm text-[#f1f5f2] placeholder-[#5d6d61] focus:outline-none focus:border-[#528d64] transition"
              />
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#233327] hover:bg-[#2c4031] active:bg-[#1e2e22] text-[#f4f7f4] font-semibold text-sm transition border border-[#3c5e44] shadow-md flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
            </button>

            {/* Mode switcher */}
            <div className="mt-5 pt-4 border-t border-[#233126] text-center text-xs text-[#8c9c90]">
              {mode === 'login' ? (
                <span>
                  New to Digital Heroes?{' '}
                  <button
                    id="switch-to-signup-btn"
                    type="button"
                    onClick={() => { setMode('signup'); setError(null); }}
                    className="text-[#89e09f] hover:underline font-medium"
                  >
                    Register as a subscriber
                  </button>
                </span>
              ) : (
                <span>
                  Already registered?{' '}
                  <button
                    id="switch-to-login-btn"
                    type="button"
                    onClick={() => { setMode('login'); setError(null); }}
                    className="text-[#89e09f] hover:underline font-medium"
                  >
                    Sign in to your account
                  </button>
                </span>
              )}
            </div>
          </form>
        )}

        {/* STEP 2: Subscriber Onboarding Flow */}
        {step === 'onboarding' && (
          <form onSubmit={handleOnboardingSubmit} className="space-y-4">
            {currentUser && (
              <div className="p-3 rounded-lg bg-[#111713] border border-[#253629] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#1e3424] text-[#8ce2a3] flex items-center justify-center font-bold text-xs">
                    {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate max-w-[200px]">
                    <div className="font-semibold text-[#f1f5f2] truncate">
                      {currentUser.displayName || 'Subscriber'}
                    </div>
                    <div className="text-[10px] text-[#7d9082] truncate">{currentUser.email}</div>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono bg-[#18291e] px-2 py-0.5 rounded border border-[#2c4733] shrink-0">
                  Digital Hero
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#bac5bd] mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#758479] absolute left-3 top-3" />
                <input
                  id="onboarding-name-input"
                  type="text"
                  required
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#121614] border border-[#2f3d33] rounded-lg text-sm text-[#f1f5f2] placeholder-[#5d6d61] focus:outline-none focus:border-[#528d64]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#bac5bd] mb-1">
                Choose Your Beneficiary Charity
              </label>
              <select
                id="onboarding-charity-select"
                value={selectedCharity}
                onChange={(e) => setSelectedCharity(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#121614] border border-[#2f3d33] rounded-lg text-sm text-[#f1f5f2] focus:outline-none focus:border-[#528d64]"
              >
                {charities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs font-medium text-[#bac5bd] mb-1">
                <span>Subscription Charity Contribution</span>
                <span className="font-mono text-emerald-400 font-bold">{charityPercent}%</span>
              </div>
              <input
                id="onboarding-charity-percent-slider"
                type="range"
                min="10"
                max="100"
                step="5"
                value={charityPercent}
                onChange={(e) => setCharityPercent(Number(e.target.value))}
                className="w-full accent-[#5fa874] cursor-pointer"
              />
              <p className="text-[11px] text-[#7d9082] mt-0.5">
                10% minimum required by PRD with optional voluntary increase.
              </p>
            </div>

            <button
              id="onboarding-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#2b4c34] hover:bg-[#365f42] text-[#f1f8f3] font-medium text-sm transition border border-[#487a56] shadow-sm disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? 'Saving Profile...' : 'Complete Registration'}
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  setStep('auth');
                }}
                className="text-xs text-[#7e8f82] hover:text-[#c4d2c8] transition"
              >
                Sign in with a different account
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
