import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/authContext';
import { GolfScore, Charity, MonthlyDraw, WinnerRecord } from '../types';
import { 
  getScores, 
  addOrUpdateScore, 
  editScore, 
  deleteScore 
} from '../lib/scoreService';
import { getUserWins } from '../lib/drawService';
import { uploadProof } from '../lib/proofService';
import { 
  Award, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Heart, 
  ShieldCheck, 
  Upload, 
  FileText, 
  AlertCircle, 
  Clock, 
  TrendingUp,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DashboardViewProps {
  charities: Charity[];
  draws: MonthlyDraw[];
  onOpenSubscribe: () => void;
  onOpenCharities: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  charities,
  draws,
  onOpenSubscribe,
  onOpenCharities,
}) => {
  const { currentUser, userProfile, userSubscription, activateSubscription, cancelSubscription, updateUserCharity } = useAuth();

  // Score states
  const [scores, setScores] = useState<GolfScore[]>([]);
  const [scoreLoading, setScoreLoading] = useState(true);
  const [newScoreVal, setNewScoreVal] = useState<string>('36');
  const [newScoreDate, setNewScoreDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newCourseName, setNewCourseName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoreSuccess, setScoreSuccess] = useState<string | null>(null);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [isCancellingSub, setIsCancellingSub] = useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = useState<string | null>(null);

  // Edit score modal
  const [editingScore, setEditingScore] = useState<GolfScore | null>(null);
  const [editScoreVal, setEditScoreVal] = useState<number>(36);
  const [editScoreDate, setEditScoreDate] = useState<string>('');
  const [editCourseName, setEditCourseName] = useState<string>('');

  // Proof upload modal for winnings
  const [userWins, setUserWins] = useState<any[]>([]);
  const [selectedWinToVerify, setSelectedWinToVerify] = useState<any | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofNotes, setProofNotes] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofSuccess, setProofSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Selected charity info
  const userCharity = charities.find((c) => c.id === userProfile?.selectedCharityId) || charities[0];

  const loadScores = async () => {
    if (!currentUser) return;
    try {
      setScoreLoading(true);
      const data = await getScores(currentUser.uid);
      setScores(data);
    } catch (err) {
      console.error('Failed to load scores:', err);
    } finally {
      setScoreLoading(false);
    }
  };

  const loadUserWins = async () => {
    if (!currentUser) return;
    try {
      const wins = await getUserWins(currentUser.uid);
      setUserWins(wins);
    } catch (err) {
      console.error('Failed to load user wins:', err);
    }
  };

  useEffect(() => {
    loadScores();
    loadUserWins();
  }, [currentUser]);

  // Handle score submission (with automatic 5-score limit rolling and duplicate date prevention)
  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setScoreError(null);
    setScoreSuccess(null);

    const val = Number(newScoreVal);
    if (isNaN(val) || val < 1 || val > 45) {
      setScoreError('Stableford score must be between 1 and 45.');
      return;
    }
    if (!newScoreDate) {
      setScoreError('Valid date is required.');
      return;
    }

    setIsSubmittingScore(true);
    try {
      const res = await addOrUpdateScore(
        currentUser.uid,
        val,
        newScoreDate,
        newCourseName.trim(),
        newNotes.trim()
      );
      setScoreSuccess(res.message || 'Score recorded successfully!');
      setNewCourseName('');
      setNewNotes('');
      await loadScores();
    } catch (err: any) {
      setScoreError(err?.message || 'Failed to submit score.');
    } finally {
      setIsSubmittingScore(false);
    }
  };

  const handleEditScoreSave = async () => {
    if (!currentUser || !editingScore) return;
    try {
      await editScore(
        currentUser.uid,
        editingScore.id,
        editScoreVal,
        editScoreDate,
        editCourseName
      );
      setEditingScore(null);
      await loadScores();
    } catch (err: any) {
      alert(err?.message || 'Failed to update score.');
    }
  };

  const handleDeleteScore = async (scoreId: string) => {
    if (!currentUser) return;
    if (!confirm('Are you sure you want to delete this score entry?')) return;
    try {
      await deleteScore(currentUser.uid, scoreId);
      await loadScores();
    } catch (err) {
      console.error('Failed to delete score:', err);
    }
  };

  // Proof upload submission
  const handleUploadProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWinToVerify || !proofFile) return;

    setUploadingProof(true);
    setUploadError(null);
    
    console.log('DashboardView: Starting Cloudinary-based proof submission flow...');
    
    try {
      // Step 1: Upload directly to our server API (which proxies to Cloudinary)
      console.log('DashboardView: Uploading proof to secure server endpoint...');
      
      await uploadProof({
        winnerId: selectedWinToVerify.id,
        file: proofFile,
        notes: proofNotes
      });
      
      console.log('DashboardView: Winner record updated with Cloudinary proof successfully');
      
      setProofSuccess(true);
      confetti();
      await loadUserWins();
      
      setTimeout(() => {
        setProofSuccess(false);
        setSelectedWinToVerify(null);
        setProofFile(null);
        setProofNotes('');
      }, 2500);
    } catch (err: any) {
      console.error('DashboardView: Fatal error in submission flow:', err);
      setUploadError(err?.message || 'Failed to upload your proof. Please ensure the image is valid and try again.');
    } finally {
      setUploadingProof(false);
    }
  };

  // Compute total winnings
  const totalWinnings = userWins.reduce((acc, w) => acc + (w.prizeShareAmount || 0), 0);
  const nextDraw = draws[0];

  return (
    <div id="subscriber-dashboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 text-[#E8EAE6]">
      
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-[#28362d] mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1b2b20] border border-[#324f3b] text-[#8ae0a0] text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Section 10 · Subscriber Dashboard</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#F4F6F2]">
            Welcome back, {userProfile?.displayName || 'Subscriber'}
          </h1>
          <p className="text-xs sm:text-sm text-[#8f9f92] mt-1">
            Track your 5-score Stableford rolling card, manage your membership, and review draw participation.
          </p>
        </div>

        {/* Subscription Badge & Demo Management */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="p-3 bg-[#151c17] border border-[#2b3b2f] rounded-xl text-xs w-full sm:w-auto">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] uppercase text-[#738878] font-mono">Subscription (Demo Mode)</span>
              <span className="text-[10px] text-amber-300/80 font-mono bg-[#232014] px-1.5 py-0.5 rounded border border-[#3e381f]">
                No Real Payment
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 font-bold">
              <span className={`w-2 h-2 rounded-full ${userProfile?.subscriptionStatus === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className="capitalize text-[#f1f5f2]">{userProfile?.subscriptionStatus || 'Inactive'}</span>
              <span className="text-[#7b8f80]">({userProfile?.subscriptionPlan || 'Monthly'})</span>
            </div>
            {userProfile?.subscriptionRenewalDate && (
              <div className="text-[10px] text-[#718475] mt-1">
                Next Renewal: {userProfile.subscriptionRenewalDate.split('T')[0]}
              </div>
            )}
            {userProfile?.subscriptionStatus === 'cancelled' && (
              <div className="text-[10px] text-amber-400/90 mt-1">
                Access expires at end of current period.
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {userProfile?.subscriptionStatus === 'active' ? (
              <button
                id="cancel-subscription-btn"
                type="button"
                disabled={isCancellingSub}
                onClick={async () => {
                  setSubscriptionMessage('Cancellation clicked');
                  
                  if (!currentUser?.uid) {
                    setSubscriptionMessage('Error: No authenticated user ID found.');
                    return;
                  }

                  setIsCancellingSub(true);
                  try {
                    const result = await cancelSubscription();
                    
                    if (result && result.success) {
                      setSubscriptionMessage('Cancellation successful');
                    } else {
                      setSubscriptionMessage('Cancellation result received but success was false.');
                    }
                  } catch (err: any) {
                    setSubscriptionMessage('Firebase Error: ' + (err?.message || 'Unknown error'));
                  } finally {
                    setIsCancellingSub(false);
                  }
                }}
                className="py-2.5 px-3.5 rounded-lg bg-[#241c1c] hover:bg-[#382323] border border-[#442c2c] text-xs text-rose-300 transition cursor-pointer disabled:opacity-50"
              >
                {isCancellingSub ? 'Cancelling...' : 'Cancel Demo Subscription'}
              </button>
            ) : (
              <button
                id="activate-membership-btn"
                onClick={onOpenSubscribe}
                className="py-2.5 px-4 rounded-lg bg-[#274732] hover:bg-[#345f42] text-xs font-semibold text-white transition shadow-sm cursor-pointer"
              >
                Activate Membership
              </button>
            )}
          </div>
        </div>
      </div>

      {subscriptionMessage && (
        <div className="mb-6 p-3 rounded-lg bg-[#19241b] border border-[#2d4734] text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{subscriptionMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: GOLF SCORES (PRD § 05) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card: Add Score */}
          <div className="bg-[#151c17] border border-[#2c3d31] rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#F4F6F2] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Log Stableford Round (1–45)
                </h3>
                <p className="text-xs text-[#899c8e]">
                  1 score per date. New score replaces the oldest once 5 scores are reached.
                </p>
              </div>
              <div className="font-mono text-xs px-2.5 py-1 rounded bg-[#101512] border border-[#263529] text-[#8ce2a3]">
                Retained: {scores.length}/5
              </div>
            </div>

            {scoreError && (
              <div className="mb-4 p-3 rounded-lg bg-[#331c1c] border border-[#522929] text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{scoreError}</span>
              </div>
            )}

            {scoreSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-[#18291e] border border-[#2c5237] text-xs text-emerald-300 flex items-start gap-2">
                <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <span>{scoreSuccess}</span>
              </div>
            )}

            {userProfile?.subscriptionStatus !== 'active' ? (
              <div className="p-5 rounded-lg bg-[#111713] border border-[#2d3f32] text-center space-y-3">
                <div className="w-9 h-9 rounded-full bg-[#1b2b20] border border-[#37533f] text-[#8ce2a3] flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#f1f5f2]">Active Subscription Required</h4>
                  <p className="text-xs text-[#8d9e91] mt-1 max-w-md mx-auto">
                    Logging Stableford scores and entering monthly prize draws requires an active membership. Activate a demo subscription to test all subscriber functionality.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenSubscribe}
                  className="px-4 py-2 rounded-lg bg-[#274732] hover:bg-[#345f42] text-xs font-semibold text-white transition shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                >
                  <span>Activate Demo Subscription</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleScoreSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#bac5bd] mb-1">
                    Stableford Score (1–45)
                  </label>
                  <input
                    id="score-input-number"
                    type="number"
                    min="1"
                    max="45"
                    required
                    value={newScoreVal}
                    onChange={(e) => setNewScoreVal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#101512] border border-[#2b3a2f] rounded-lg text-sm font-mono font-bold text-[#8ce2a3] focus:outline-none focus:border-[#4f8d62]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#bac5bd] mb-1">
                    Round Date (Required)
                  </label>
                  <input
                    id="score-input-date"
                    type="date"
                    required
                    value={newScoreDate}
                    onChange={(e) => setNewScoreDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#101512] border border-[#2b3a2f] rounded-lg text-sm text-[#f1f5f2] focus:outline-none focus:border-[#4f8d62]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#bac5bd] mb-1">
                    Golf Course (Optional)
                  </label>
                  <input
                    id="score-input-course"
                    type="text"
                    placeholder="e.g. Royal Calcutta / Delhi Golf Club"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#101512] border border-[#2b3a2f] rounded-lg text-xs text-[#f1f5f2] focus:outline-none focus:border-[#4f8d62]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#bac5bd] mb-1">
                    Round Notes (Optional)
                  </label>
                  <input
                    id="score-input-notes"
                    type="text"
                    placeholder="e.g. 4 birdies, firm greens"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-[#101512] border border-[#2b3a2f] rounded-lg text-xs text-[#f1f5f2] focus:outline-none focus:border-[#4f8d62]"
                  />
                </div>
              </div>

                <button
                  id="submit-score-btn"
                  type="submit"
                  disabled={isSubmittingScore}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#274631] hover:bg-[#325a40] text-[#f2faf4] font-medium text-xs transition border border-[#447854] shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmittingScore ? 'Saving Score...' : 'Record Round to Draw Card'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Card: 5-Score History (Reverse Chronological) */}
          <div className="bg-[#151c17] border border-[#2c3d31] rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-bold text-[#F4F6F2]">
                Active 5-Score History (Most Recent First)
              </h3>
              <span className="text-xs text-[#7d9082]">Eligible in upcoming draws</span>
            </div>

            {scoreLoading ? (
              <div className="py-8 text-center text-xs text-[#7e9282]">Loading score history...</div>
            ) : scores.length === 0 ? (
              <div className="py-8 text-center bg-[#101512] rounded-lg border border-[#233127] text-xs text-[#7d9082]">
                No scores recorded yet. Enter your first Stableford score above.
              </div>
            ) : (
              <div className="space-y-2.5">
                {scores.map((s, idx) => (
                  <div
                    key={s.id}
                    id={`score-item-${s.id}`}
                    className="p-3.5 rounded-lg bg-[#111612] border border-[#243327] hover:border-[#38513e] transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#1a281e] border border-[#304837] flex items-center justify-center font-mono font-bold text-base text-[#8ce2a3]">
                        {s.score}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-[#f1f5f2] font-semibold">{s.date}</span>
                          {idx === 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-[#203426] text-[10px] text-emerald-300 font-semibold">
                              Latest
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#788e7e]">
                          {s.courseName || 'Stableford Round'} {s.notes && `· ${s.notes}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        id={`edit-score-${s.id}`}
                        onClick={() => {
                          setEditingScore(s);
                          setEditScoreVal(s.score);
                          setEditScoreDate(s.date);
                          setEditCourseName(s.courseName || '');
                        }}
                        className="p-1.5 rounded hover:bg-[#1f2d23] text-[#86998b] hover:text-[#f1f5f2] transition"
                        title="Edit score"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`delete-score-${s.id}`}
                        onClick={() => handleDeleteScore(s.id)}
                        className="p-1.5 rounded hover:bg-[#301b1b] text-[#86998b] hover:text-rose-400 transition"
                        title="Delete score"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CHARITY, DRAWS, WINNINGS OVERVIEW */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card: Selected Charity */}
          <div className="bg-[#151c17] border border-[#2c3d31] rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-base font-bold text-[#F4F6F2] flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400" />
                Chosen Charity Recipient
              </h3>
              <button
                onClick={onOpenCharities}
                className="text-xs text-[#8ce2a3] hover:underline"
              >
                Change Cause
              </button>
            </div>

            {userCharity && (
              <div className="p-3.5 rounded-lg bg-[#111713] border border-[#253528] space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-[#f1f5f2]">{userCharity.name}</h4>
                    <span className="text-[11px] text-[#788e7f]">{userCharity.category}</span>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded bg-[#203125] font-mono text-xs text-emerald-400 font-bold block">
                      {userProfile?.charityContributionPercent || 10}% Directed
                    </span>
                    <span className="text-[10px] text-[#5e7766] mt-1 block">From your fee</span>
                  </div>
                </div>

                <p className="text-xs text-[#8e9f92] line-clamp-2">{userCharity.tagline}</p>

                <div className="pt-2 border-t border-[#212f24] flex justify-between text-xs text-[#7d9082]">
                  <span>Total Org Raised:</span>
                  <span className="font-mono text-[#8ce2a3] font-semibold">
                    ${userCharity.totalRaised?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Card: Participation & Upcoming Draw */}
          <div className="bg-[#151c17] border border-[#2c3d31] rounded-xl p-6 shadow-md">
            <h3 className="font-serif text-base font-bold text-[#F4F6F2] flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-amber-400" />
              Draw Participation & Upcoming
            </h3>

            <div className="p-3.5 rounded-lg bg-[#111713] border border-[#253528] space-y-2 text-xs">
              <div className="flex justify-between text-[#8e9f92]">
                <span>Active Numbers in Play:</span>
                <span className="font-mono text-[#f1f5f2] font-semibold">
                  {scores.map((s) => s.score).join(', ') || 'None (Log scores)'}
                </span>
              </div>
              <div className="flex justify-between text-[#8e9f92]">
                <span>Next Scheduled Draw:</span>
                <span className="font-mono text-emerald-400 font-semibold">End of Current Month</span>
              </div>
              <div className="flex justify-between text-[#8e9f92]">
                <span>Participation Status:</span>
                <span className="text-emerald-300 font-medium">
                  {userProfile?.subscriptionStatus === 'active' ? '✓ Eligible & Entered' : 'Requires Active Membership'}
                </span>
              </div>
            </div>
          </div>

          {/* Card: Winnings & Verification Status (PRD § 08, 09, 10) */}
          <div className="bg-[#151c17] border border-[#2c3d31] rounded-xl p-6 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-base font-bold text-[#F4F6F2]">
                Winnings & Verification
              </h3>
              <div className="font-mono text-base font-bold text-amber-300">
                ${totalWinnings} Won
              </div>
            </div>

            {userWins.length === 0 ? (
              <div className="p-4 rounded-lg bg-[#101512] border border-[#233127] text-xs text-[#7d9082] text-center">
                No prize winnings registered for this account yet. Keep entering scores to qualify for monthly 3, 4, and 5-number matches!
              </div>
            ) : (
              <div className="space-y-3">
                {userWins.map((win) => (
                  <div key={win.id} className="p-3 rounded-lg bg-[#111612] border border-[#253528] text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#f1f5f2]">{win.drawTitle || 'Monthly Draw'}</span>
                      <span className="font-mono text-[#8ce2a3] font-bold">${win.prizeShareAmount}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#7f9384]">
                      <span>Matched {win.matchType} ({win.matchedNumbers?.join(', ')})</span>
                      <span className={`px-2 py-0.5 rounded capitalize font-semibold ${
                        win.paymentStatus === 'paid' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                      }`}>
                        Payment: {win.paymentStatus}
                      </span>
                    </div>

                    {/* Verification & Payout Status Lifecycle */}
                    <div className="pt-2 border-t border-[#233127] flex items-center justify-between">
                      <div className="text-[11px]">
                        <span className="text-[#6c8071]">Verification: </span>
                        <span className={`font-medium capitalize ${
                          win.proofStatus === 'approved' ? 'text-emerald-400' : 
                          win.proofStatus === 'rejected' ? 'text-rose-400' : 
                          win.proofStatus === 'none' ? 'text-[#7d9082]' : 'text-amber-400'
                        }`}>
                          {win.proofStatus === 'none' ? 'Not Submitted' : win.proofStatus?.replace('_', ' ')}
                        </span>
                      </div>
                      
                      {win.paymentStatus === 'paid' ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-800/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                          <Check className="w-3 h-3" />
                          <span>Prize Paid</span>
                        </div>
                      ) : win.proofStatus === 'approved' ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-950/50 border border-blue-800/30 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Approved · Processing Payout</span>
                        </div>
                      ) : win.proofStatus === 'none' || win.proofStatus === 'rejected' ? (
                        <button
                          onClick={() => setSelectedWinToVerify(win)}
                          className="px-2.5 py-1 rounded bg-[#274631] hover:bg-[#345e41] text-[11px] font-medium text-white transition flex items-center gap-1 shadow-sm"
                        >
                          <Upload className="w-3 h-3" />
                          <span>{win.proofStatus === 'rejected' ? 'Re-upload Proof' : 'Upload Proof'}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950/50 border border-amber-800/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                          <Clock className="w-3 h-3" />
                          <span>Submitted · Under Review</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* EDIT SCORE MODAL */}
      {editingScore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0d0b]/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-[#161c18] border border-[#2e3e32] rounded-xl shadow-2xl p-6 text-[#E8EAE6] relative">
            <button
              onClick={() => setEditingScore(null)}
              className="absolute top-4 right-4 text-[#88988c] hover:text-[#f2f6f3]"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif text-lg font-bold text-[#f2f6f3] mb-4">
              Edit Score Entry
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#bac5bd] mb-1">
                  Stableford Score (1–45)
                </label>
                <input
                  type="number"
                  min="1"
                  max="45"
                  value={editScoreVal}
                  onChange={(e) => setEditScoreVal(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#101512] border border-[#2b3a2f] rounded-lg text-sm font-mono font-bold text-[#8ce2a3] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#bac5bd] mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={editScoreDate}
                  onChange={(e) => setEditScoreDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#101512] border border-[#2b3a2f] rounded-lg text-xs text-[#f1f5f2] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#bac5bd] mb-1">
                  Course Name
                </label>
                <input
                  type="text"
                  value={editCourseName}
                  onChange={(e) => setEditCourseName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#101512] border border-[#2b3a2f] rounded-lg text-xs text-[#f1f5f2] focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingScore(null)}
                  className="flex-1 py-2 rounded-lg bg-[#1b251e] text-xs text-[#a0b0a4]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEditScoreSave}
                  className="flex-1 py-2 rounded-lg bg-[#274631] text-xs font-semibold text-white"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD WINNER PROOF MODAL (PRD § 09) */}
      {selectedWinToVerify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0d0b]/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#161c18] border border-[#2e3e32] rounded-xl shadow-2xl p-6 text-[#E8EAE6] relative">
            <button
              onClick={() => setSelectedWinToVerify(null)}
              className="absolute top-4 right-4 text-[#88988c] hover:text-[#f2f6f3]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#8ce2a3]">Verification Step</span>
              <h3 className="font-serif text-xl font-bold text-[#f2f6f3] mt-1">
                Upload Scorecard Proof
              </h3>
              <p className="text-xs text-[#8f9e92] mt-1">
                To complete your prize distribution of ${selectedWinToVerify.prizeShareAmount}, please attach a photo or screenshot of your recorded scorecard or golf club handicap sheet.
              </p>
            </div>

            {uploadError && (
              <div className="mb-4 p-3 rounded-lg bg-[#331c1c] border border-[#522929] text-xs text-rose-300 flex items-start gap-2 animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="flex-1">
                  <span className="font-bold block mb-0.5">Upload Error</span>
                  <span>{uploadError}</span>
                  {uploadError.includes('CORS') && (
                    <span className="block mt-1 opacity-80 italic">
                      Note: Browser security is blocking the direct upload. We will attempt a secure local fallback.
                    </span>
                  )}
                </div>
              </div>
            )}

            {proofSuccess ? (
              <div className="p-6 rounded-lg bg-[#182b1e] border border-[#3b5e45] text-center space-y-2">
                <Check className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="font-serif text-base font-bold text-[#eef7f0]">Proof Uploaded!</h4>
                <p className="text-xs text-[#a5c2ac]">The admin team has received your verification and will review within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleUploadProofSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#bac5bd] mb-1">
                    Select Screenshot / Scorecard Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-[#9eb1a3] file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#274631] file:text-[#e8f7ed] hover:file:bg-[#345d41]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#bac5bd] mb-1">
                    Club or Verification Notes
                  </label>
                  <textarea
                    rows={2}
                    value={proofNotes}
                    onChange={(e) => setProofNotes(e.target.value)}
                    placeholder="e.g. Official card verified by club pro / Golf handicap app screenshot"
                    className="w-full px-3 py-2 bg-[#101512] border border-[#2b3a2f] rounded-lg text-xs text-[#f1f5f2] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploadingProof || !proofFile}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#274631] hover:bg-[#325a40] text-[#f2faf4] font-medium text-xs transition border border-[#447854] shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {uploadingProof ? 'Processing & Saving Proof...' : 'Submit Verification for Admin Review'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
