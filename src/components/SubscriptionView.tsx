import React, { useState } from 'react';
import { useAuth } from '../lib/authContext';
import { Charity, SubscriptionPlan } from '../types';
import { Check, ShieldCheck, Heart, Info, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SubscriptionViewProps {
  charities: Charity[];
  onSuccess: () => void;
  onOpenAuth: () => void;
}

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({
  charities,
  onSuccess,
  onOpenAuth,
}) => {
  const { currentUser, userProfile, activateSubscription, updateUserCharity } = useAuth();

  const [plan, setPlan] = useState<SubscriptionPlan>('monthly');
  const [selectedCharityId, setSelectedCharityId] = useState<string>(
    userProfile?.selectedCharityId || charities[0]?.id || 'charity-fairway-foundation'
  );
  const [charityPercent, setCharityPercent] = useState<number>(
    userProfile?.charityContributionPercent || 10
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const monthlyPrice = 29;
  const yearlyPrice = 290;
  const baseFee = plan === 'monthly' ? monthlyPrice : yearlyPrice;
  const charityContributionAmount = Math.round((baseFee * charityPercent) / 100);
  const prizePoolAllocation = Math.round((baseFee * 35) / 100);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Load Razorpay script
      const res = await loadRazorpay();
      if (!res) {
        throw new Error('Razorpay SDK failed to load. Are you online?');
      }

      // 2. Create subscription on server
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plan, 
          userId: currentUser.uid 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize subscription');
      }

      const { subscriptionId, keyId } = await response.json();

      // 3. Open Razorpay Checkout
      const options = {
        key: keyId,
        subscription_id: subscriptionId,
        name: 'Digital Heroes',
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Membership`,
        image: 'https://ais-pre-o5q3xamx4zwxooyqgodsob-886844404622.asia-southeast1.run.app/logo.png', // Fallback to absolute URL if possible
        handler: async function (response: any) {
          console.log('Razorpay: Payment successful', response);
          
          setPaymentSuccess(true);
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 }
          });
          
          // Requirement: Ensure charity choice is saved
          await updateUserCharity(selectedCharityId, charityPercent);
          
          // Wait for backend to process webhook (the server handles subscription state)
          // For UI immediate feedback, we rely on setPaymentSuccess
          setTimeout(() => {
            onSuccess();
          }, 2400);
        },
        prefill: {
          name: userProfile?.displayName || '',
          email: userProfile?.email || '',
        },
        theme: {
          color: '#274631',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error('Razorpay: Payment failed', response.error);
        setErrorMessage(`Payment failed: ${response.error.description}`);
      });
      rzp.open();

    } catch (err: any) {
      console.error('Subscription error:', err);
      setErrorMessage(err?.message || 'Failed to initiate payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="subscription-page" className="max-w-4xl mx-auto px-4 py-10 sm:py-16 text-[#E8EAE6]">
      {/* Title block */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1b2b20] border border-[#324f3b] text-[#8ae0a0] text-xs font-semibold uppercase tracking-wider mb-4">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Membership & Secure Payment</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#F4F6F2] tracking-tight">
          One Membership. Continuous Impact.
        </h1>
        <p className="text-sm sm:text-base text-[#91a094] mt-2.5">
          Access the 5-score Stableford tracking system, enter monthly prize pools, and directly fund registered charitable initiatives every single month.
        </p>
      </div>

      {/* Plan Switcher */}
      <div className="flex justify-center mb-8">
        <div className="bg-[#141b16] p-1 rounded-xl border border-[#2b3a30] inline-flex items-center">
          <button
            id="plan-toggle-monthly"
            type="button"
            onClick={() => setPlan('monthly')}
            className={`px-5 py-2 rounded-lg text-xs font-semibold transition ${
              plan === 'monthly'
                ? 'bg-[#274631] text-[#e8f7ed] shadow-sm'
                : 'text-[#8b998e] hover:text-[#e8eae6]'
            }`}
          >
            Monthly Billing ($29/mo)
          </button>
          <button
            id="plan-toggle-yearly"
            type="button"
            onClick={() => setPlan('yearly')}
            className={`px-5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              plan === 'yearly'
                ? 'bg-[#274631] text-[#e8f7ed] shadow-sm'
                : 'text-[#8b998e] hover:text-[#e8eae6]'
            }`}
          >
            <span>Annual Billing ($290/yr)</span>
            <span className="bg-[#386244] text-[#c0f0cf] text-[10px] px-1.5 py-0.5 rounded font-bold">Save 17%</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left: Summary & Charity Selection */}
        <div className="md:col-span-7 space-y-6">
          
          {/* Card: Charity Allocation Breakdown */}
          <div className="bg-[#151c17] border border-[#2c3d31] rounded-xl p-6 shadow-md">
            <h3 className="font-serif text-lg font-bold text-[#f2f6f3] flex items-center gap-2 mb-4">
              <Heart className="w-4 h-4 text-emerald-400" />
              Direct Your Charitable Impact
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#bac7bd] mb-1.5">
                  Select Recipient Charity
                </label>
                <select
                  id="subscription-charity-select"
                  value={selectedCharityId}
                  onChange={(e) => setSelectedCharityId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0f1411] border border-[#2b3b2f] rounded-lg text-sm text-[#f1f5f2] focus:outline-none focus:border-[#4d8a5f]"
                >
                  {charities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-medium text-[#bac7bd] mb-1.5">
                  <span>Voluntary Charity Percentage</span>
                  <span className="font-mono text-emerald-400 font-bold text-sm">{charityPercent}%</span>
                </div>
                <input
                  id="subscription-charity-slider"
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={charityPercent}
                  onChange={(e) => setCharityPercent(Number(e.target.value))}
                  className="w-full accent-[#5fa874] cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-[#718476] mt-1">
                  <span>10% (Required Minimum)</span>
                  <span>Optional Voluntary Increase</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {/* Live Financial Transparency Allocation Box */}
            <div className="mt-5 p-4 rounded-lg bg-[#111713] border border-[#253328] space-y-2 text-xs">
              <div className="flex justify-between text-[#8e9f92]">
                <span>Membership Price:</span>
                <span className="font-mono text-[#f1f5f2] font-semibold">${baseFee} {plan === 'monthly' ? '/mo' : '/yr'}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Charity Guaranteed Allocation ({charityPercent}%):</span>
                <span className="font-mono font-bold">${charityContributionAmount}</span>
              </div>
              <div className="flex justify-between text-[#a0b0a3]">
                <span>Prize Pool Allocation (~35%):</span>
                <span className="font-mono font-medium">${prizePoolAllocation}</span>
              </div>
              <div className="flex justify-between text-[#7d8f81] pt-1 border-t border-[#233026]">
                <span>Platform Operations & Score Engine:</span>
                <span className="font-mono">${Math.max(0, baseFee - charityContributionAmount - prizePoolAllocation)}</span>
              </div>
            </div>
          </div>

          {/* Feature List */}
          <div className="bg-[#151c17] border border-[#2c3d31] rounded-xl p-6">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-[#8a9b8e] mb-3">
              Included In Every Membership
            </h4>
            <ul className="space-y-2.5 text-xs text-[#d1dbd4]">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Rolling 5-score Stableford handicap performance tracker</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Automatic entry into every Monthly Prize Draw (3, 4, and 5-number matches)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Direct charitable giving receipt and transparent impact tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Auditable server-side draw simulation and jackpot rollover protection</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right: Demo Subscription Activation Card */}
        <div className="md:col-span-5">
          <div className="bg-[#17201a] border border-[#314336] rounded-xl p-6 shadow-xl sticky top-24">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#29372d] mb-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#7c9183]">Membership Tier</span>
                <div className="font-serif text-3xl font-bold text-[#f4f7f4]">
                  ${baseFee}
                  <span className="text-xs font-sans font-normal text-[#8d9f92]"> / {plan === 'monthly' ? 'month' : 'year'}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#202c23] border border-[#364939] text-[11px] text-[#90cba1] font-mono">
                <span>Secure Checkout</span>
              </div>
            </div>

            {/* Razorpay notice */}
            <div className="mb-4 p-3.5 rounded-lg bg-[#141d16] border border-[#2b3c2e] text-xs space-y-1.5 text-[#a8b8ac]">
              <div className="flex items-center gap-1.5 font-semibold text-[#e1ece4]">
                <ShieldCheck className="w-4 h-4 text-[#8cd49f] shrink-0" />
                <span>Subscription Activation</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#92a396]">
                Secure payment integration powered by Razorpay. Your subscription grants full access to score tracking, charity allocation, and monthly prize draws.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-[#331c1c] border border-[#592b2b] text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {paymentSuccess ? (
              <div className="p-6 rounded-lg bg-[#182b1e] border border-[#3b5e45] text-center space-y-2 animate-fade-in">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <div className="font-serif text-lg font-bold text-[#eef7f0]">Subscription Active!</div>
                <p className="text-xs text-[#a5c2ac]">
                  Your chosen charity is now receiving {charityPercent}% of your fee, and your scores are entered into upcoming draws.
                </p>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleSubscribe(); }} className="space-y-4">
                <div className="p-3.5 rounded-lg bg-[#101512] border border-[#27352b] text-xs space-y-2">
                  <div className="flex justify-between text-[#8b9c8f]">
                    <span>Selected Plan:</span>
                    <span className="font-medium text-[#f1f5f2] capitalize">{plan} (${baseFee})</span>
                  </div>
                  <div className="flex justify-between text-[#8b9c8f]">
                    <span>Billing Renewal:</span>
                    <span className="font-medium text-[#f1f5f2]">{plan === 'yearly' ? 'Every 365 Days' : 'Every 30 Days'}</span>
                  </div>
                  <div className="flex justify-between text-[#8b9c8f]">
                    <span>Payment Processing:</span>
                    <span className="text-emerald-400/90 font-mono text-[11px]">Razorpay Secure</span>
                  </div>
                </div>

                <div className="text-[11px] text-[#7d9081]">
                  By activating this subscription, your account gains active subscriber status. You can cancel anytime from your dashboard.
                </div>

                <button
                  id="submit-payment-btn"
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 px-4 rounded-lg bg-[#274a32] hover:bg-[#325d3e] text-[#f2faf4] font-medium text-sm transition border border-[#447854] shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? (
                    <span>Initializing Checkout...</span>
                  ) : (
                    <span>Subscribe Now (${baseFee})</span>
                  )}
                </button>
              </form>
            )}

            <div className="mt-4 pt-3 border-t border-[#253328] text-center">
              <span className="text-[11px] text-[#718475]">
                PCI Compliant · Secured by Razorpay · Auto-renewal included
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
