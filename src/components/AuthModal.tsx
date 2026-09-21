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
  const { currentUser, userProfile, signInWithGoogle, completeOnboarding, logout } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [step, setStep] = useState<'auth' | 'onboarding'>('auth');

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

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      const user = await signInWithGoogle();
      // Check if user profile already exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userDocRef);

      if (snap.exists() && snap.data()?.selectedCharityId) {
        // Returning user with complete profile
        onSuccess();
        onClose();
      } else {
        // New user or missing charity selection: proceed to onboarding
        setName(user.displayName || '');
        setStep('onboarding');
      }
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      let msg = err?.message || 'Failed to sign in with Google. Please try again.';
      if (err?.code === 'auth/popup-closed-by-user') {
        msg = 'Sign-in window was closed before completing authentication. Please try again.';
      } else if (err?.code === 'auth/cancelled-popup-request') {
        msg = 'Previous sign-in request was cancelled. Please try again.';
      } else if (err?.code === 'auth/popup-blocked') {
        msg = 'The sign-in popup was blocked by your browser. Please allow popups for this site.';
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
      await completeOnboarding(name.trim(), selectedCharity, charityPercent);
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

        {/* STEP 1: Google Authentication */}
        {step === 'auth' && (
          <div className="space-y-4">
            <button
              id="google-signin-btn"
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full py-3 px-4 rounded-xl bg-[#233327] hover:bg-[#2c4031] active:bg-[#1e2e22] text-[#f4f7f4] font-semibold text-sm transition border border-[#3c5e44] shadow-md flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{loading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            <p className="text-[11px] text-center text-[#7e8f82]">
              Fast, authenticated access powered by Google. No password required.
            </p>

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
                    Sign in with Google
                  </button>
                </span>
              )}
            </div>
          </div>
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
                      {currentUser.displayName || 'Google Member'}
                    </div>
                    <div className="text-[10px] text-[#7d9082] truncate">{currentUser.email}</div>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono bg-[#18291e] px-2 py-0.5 rounded border border-[#2c4733] shrink-0">
                  Google Verified
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
