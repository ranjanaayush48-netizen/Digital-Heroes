import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/authContext';
import { 
  UserProfile, 
  Charity, 
  MonthlyDraw, 
  DrawMethod, 
  GolfScore, 
  SubscriptionStatus 
} from '../types';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  simulateMonthlyDraw, 
  publishMonthlyDraw, 
  getAllWinners, 
  reviewWinnerProof, 
  markWinnerPayout 
} from '../lib/drawService';
import { createCharity, updateCharity, deleteCharity } from '../lib/charityService';
import { 
  Users, 
  Award, 
  Heart, 
  CheckSquare, 
  BarChart3, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  Play, 
  Upload, 
  ExternalLink, 
  AlertCircle,
  Shield,
  Coins
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AdminDashboardProps {
  charities: Charity[];
  draws: MonthlyDraw[];
  onRefreshData: () => Promise<void> | void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  charities,
  draws,
  onRefreshData,
}) => {
  const { userProfile, isAdmin } = useAuth();

  // Active subtab
  const [activeTab, setActiveTab] = useState<'users' | 'draws' | 'charities' | 'winners' | 'analytics'>('draws');

  // Users tab state
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserForScores, setSelectedUserForScores] = useState<UserProfile | null>(null);
  const [userScoresList, setUserScoresList] = useState<GolfScore[]>([]);

  // Draw Management state
  const [drawMonth, setDrawMonth] = useState<string>(
    new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 7)
  );
  const [drawMethod, setDrawMethod] = useState<DrawMethod>('algorithmic');
  const [allocationPerSub, setAllocationPerSub] = useState<number>(10);
  const [jackpotRolloverIn, setJackpotRolloverIn] = useState<number>(
    draws[0]?.jackpotRolloverOut ?? 2500
  );
  const [simulatedDraw, setSimulatedDraw] = useState<MonthlyDraw | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);

  // Winners Management state
  const [winnersList, setWinnersList] = useState<any[]>([]);
  const [loadingWinners, setLoadingWinners] = useState(false);
  const [paymentConfirmWinner, setPaymentConfirmWinner] = useState<any | null>(null);
  const [paying, setPaying] = useState(false);

  // Test Mode state
  const [testModeEnabled, setTestModeEnabled] = useState(false);
  const [manualNumbers, setManualNumbers] = useState<string>('');
  const [showTestConfirm, setShowTestConfirm] = useState(false);

  // Charity modal state
  const [charityModalOpen, setCharityModalOpen] = useState(false);
  const [editingCharityId, setEditingCharityId] = useState<string | null>(null);
  const [charityName, setCharityName] = useState('');
  const [charityCategory, setCharityCategory] = useState('');
  const [charityTagline, setCharityTagline] = useState('');
  const [charityDescription, setCharityDescription] = useState('');
  const [charityMission, setCharityMission] = useState('');
  const [charityImageUrl, setCharityImageUrl] = useState('');
  const [charityFeatured, setCharityFeatured] = useState(false);

  // Load Users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: UserProfile[] = [];
      snap.forEach((d) => list.push(d.data() as UserProfile));
      setUsersList(list);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load Winners
  const fetchWinners = async () => {
    setLoadingWinners(true);
    try {
      const list = await getAllWinners();
      setWinnersList(list);
    } catch (err) {
      console.error('Failed to load winners:', err);
    } finally {
      setLoadingWinners(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'winners') fetchWinners();
  }, [activeTab]);

  // Requirement 2 & 4: Update rollover when month or draws change
  useEffect(() => {
    // Recalculate rollover based on the most recent published draw BEFORE the selected month
    const sortedDraws = [...draws].sort((a, b) => b.month.localeCompare(a.month));
    const previousDraw = sortedDraws.find(d => d.month < drawMonth && d.status === 'published');
    
    if (previousDraw) {
      setJackpotRolloverIn(previousDraw.jackpotRolloverOut || 0);
    } else {
      // Fallback if no history
      setJackpotRolloverIn(2500);
    }
  }, [drawMonth, draws]);

  // Clear simulation ONLY when the month changes, not every time draws prop updates
  useEffect(() => {
    setSimulatedDraw(null);
    setPublishStatus(null);
  }, [drawMonth]);

  // Handle Simulation
  const handleSimulateDraw = async () => {
    setSimulating(true);
    try {
      let customNums: number[] | undefined = undefined;
      
      // Ensure TEST MODE is only used for unpublished months
      const isAlreadyPublished = draws.some(d => d.month === drawMonth && d.status === 'published');
      
      if (testModeEnabled && manualNumbers && !isAlreadyPublished) {
        const parsed = manualNumbers.split(',')
          .map(n => parseInt(n.trim()))
          .filter(n => !isNaN(n));
        
        if (parsed.length !== 5) {
          throw new Error('TEST MODE ERROR: Please enter exactly 5 numbers (comma-separated).');
        }
        
        if (parsed.some(n => n < 1 || n > 45)) {
          throw new Error('TEST MODE ERROR: Numbers must be between 1 and 45.');
        }

        const unique = new Set(parsed);
        if (unique.size !== 5) {
          throw new Error('TEST MODE ERROR: Duplicate numbers are not allowed.');
        }
        
        customNums = Array.from(unique);
      }

      const sim = await simulateMonthlyDraw({
        month: drawMonth,
        drawMethod,
        monthlyAllocationPerSub: allocationPerSub,
        jackpotRolloverIn,
        customWinningNumbers: customNums,
      });

      // Mark the simulation if custom numbers were used
      if (customNums) {
        (sim as any).isTestDraw = true;
      }

      setSimulatedDraw(sim);
    } catch (err: any) {
      alert(err?.message || 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  // Handle Publishing
  const handlePublishDraw = async (bypassConfirm = false) => {
    console.log('!!! ADMIN TRACE: handlePublishDraw triggered !!!');
    console.log('Admin Trace: simulatedDraw exists:', !!simulatedDraw);
    console.log('Admin Trace: drawMonth current state:', drawMonth);
    
    setPublishStatus('Initializing publish flow...');
    
    if (!simulatedDraw) {
      console.error('Admin Trace: ABORT - No simulatedDraw found in state');
      setPublishStatus('Error: No simulation found. Please re-run simulation.');
      return;
    }
    
    console.log('Admin Trace: Publishing for month:', simulatedDraw.month);
    console.log('Admin Trace: Simulation object sample:', JSON.stringify(simulatedDraw).substring(0, 200) + '...');
    
    setPublishStatus(`Checking for duplicates for ${simulatedDraw.month}...`);
    
    // Final duplication check before publishing
    const alreadyPublished = draws.some(d => d.month === simulatedDraw.month && d.status === 'published');
    console.log('Admin Trace: Duplicate check result:', alreadyPublished);

    if (alreadyPublished) {
      const msg = `DUPLICATION ERROR: An official result for ${simulatedDraw.month} already exists.`;
      console.error('Admin Trace:', msg);
      setPublishStatus('Error: Duplicate month detected');
      alert(msg);
      return;
    }

    // Handle Test Mode Confirmation (Avoid window.confirm in iframes)
    if ((simulatedDraw as any).isTestDraw && !bypassConfirm) {
      console.log('Admin Trace: Test draw detected, showing custom confirmation UI');
      setShowTestConfirm(true);
      setPublishStatus('Test Mode: Awaiting confirmation...');
      return;
    }

    console.log('Admin Trace: Proceeding to setPublishing(true)');
    setPublishing(true);
    setPublishStatus('Publishing in progress...');
    setShowTestConfirm(false);
    
    try {
      console.log('Admin Trace: Calling publishMonthlyDraw for', simulatedDraw.id);
      setPublishStatus('Firestore write started (draw document)');
      
      await publishMonthlyDraw(simulatedDraw);
      
      console.log('Admin Trace: Firestore operations completed successfully');
      setPublishStatus('Firestore write succeeded');
      
      if (typeof confetti === 'function') {
        try {
          confetti();
        } catch (confettiErr) {
          console.warn('Admin Trace: Confetti failed (non-critical)', confettiErr);
        }
      }
      
      setPublishStatus('Success! Draw published.');
      alert('Draw published successfully.');
      
      console.log('Admin Trace: Clearing simulation state');
      setSimulatedDraw(null);
      
      if (onRefreshData) {
        console.log('Admin Trace: Refreshing global data...');
        await onRefreshData();
      }
      
      if (activeTab === 'winners') {
        console.log('Admin Trace: Refreshing local winners tab...');
        await fetchWinners();
      }
      
      console.log('Admin Trace: FULL PUBLISH FLOW SUCCESSFUL');
      setTimeout(() => setPublishStatus(null), 10000);
    } catch (err: any) {
      console.error('Admin Trace: CRITICAL ERROR IN PUBLISH FLOW:', err);
      const errorMsg = err?.message || 'Unknown Firestore error';
      setPublishStatus('CRITICAL ERROR: ' + errorMsg);
      alert('CRITICAL ERROR: ' + errorMsg);
    } finally {
      console.log('Admin Trace: Setting publishing(false)');
      setPublishing(false);
    }
  };

  // User Profile Status quick-change
  const handleUpdateUserStatus = async (uid: string, status: SubscriptionStatus) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        subscriptionStatus: status,
        updatedAt: new Date().toISOString()
      });
      fetchUsers();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Inspect & Edit User Scores
  const handleInspectScores = async (user: UserProfile) => {
    setSelectedUserForScores(user);
    try {
      const scoresSnap = await getDocs(
        query(collection(db, 'users', user.uid, 'scores'), orderBy('date', 'desc'))
      );
      const scores: GolfScore[] = [];
      scoresSnap.forEach((d) => scores.push({ id: d.id, ...d.data() } as GolfScore));
      setUserScoresList(scores);
    } catch (err) {
      console.error('Failed to fetch user scores:', err);
    }
  };

  const handleDeleteUserScore = async (scoreId: string) => {
    if (!selectedUserForScores) return;
    if (!confirm('Delete this score?')) return;
    try {
      await deleteDoc(doc(db, 'users', selectedUserForScores.uid, 'scores', scoreId));
      handleInspectScores(selectedUserForScores);
    } catch (err) {
      console.error('Failed to delete score:', err);
    }
  };

  // Charity Save (Create or Update)
  const handleSaveCharity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCharityId) {
        await updateCharity(editingCharityId, {
          name: charityName,
          category: charityCategory,
          tagline: charityTagline,
          description: charityDescription,
          mission: charityMission,
          imageUrl: charityImageUrl,
          featured: charityFeatured,
        });
      } else {
        await createCharity({
          name: charityName,
          category: charityCategory,
          tagline: charityTagline,
          description: charityDescription,
          mission: charityMission,
          imageUrl: charityImageUrl,
          featured: charityFeatured,
          totalRaised: 0,
          supporterCount: 0,
          upcomingEvents: [],
          impactMetric: {
            label: 'Beneficiaries',
            value: '500+'
          }
        });
      }
      setCharityModalOpen(false);
      setEditingCharityId(null);
      onRefreshData();
    } catch (err: any) {
      alert(err?.message || 'Failed to save charity');
    }
  };

  const handleDeleteCharity = async (id: string) => {
    if (!confirm('Are you sure you want to delete this charity?')) return;
    try {
      await deleteCharity(id);
      onRefreshData();
    } catch (err) {
      console.error('Failed to delete charity:', err);
    }
  };

  // Analytics totals calculation
  const totalSubscribersCount = usersList.length || 240;
  const totalCharitiesCount = charities.length;
  const totalCharityRaisedSum = charities.reduce((acc, c) => acc + (c.totalRaised || 0), 0);
  const totalPrizePoolsCalculated = draws.reduce((acc, d) => acc + (d.totalPrizePool || 0), 0);

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-[#E8EAE6]">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-bold">Admin Portal Access Restricted</h2>
        <p className="text-xs text-[#8ca090] mt-2">
          This section requires Administrator privileges. Please sign in with an administrator account.
        </p>
      </div>
    );
  }

  return (
    <div id="admin-control-dashboard" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 text-[#E8EAE6]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 border-b border-[#293a2e] mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2a2414] border border-[#524422] text-[#e5c986] text-xs font-semibold uppercase tracking-wider mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Section 11 · Administrator Control Surfaces</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#F4F6F2]">
            Digital Heroes Master Control
          </h1>
          <p className="text-xs text-[#8f9f92] mt-1">
            Auditable server-side draw simulation, users, subscriptions, charities, and payouts.
          </p>
        </div>

        {/* Subtab Navigation */}
        <div className="flex items-center gap-1.5 bg-[#141b16] p-1 rounded-xl border border-[#2b3a2f] overflow-x-auto">
          <button
            id="admin-tab-draws"
            onClick={() => setActiveTab('draws')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === 'draws' ? 'bg-[#274631] text-[#f2faf4]' : 'text-[#8b9c8e] hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Draw Engine</span>
          </button>
          <button
            id="admin-tab-users"
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === 'users' ? 'bg-[#274631] text-[#f2faf4]' : 'text-[#8b9c8e] hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Users & Scores</span>
          </button>
          <button
            id="admin-tab-charities"
            onClick={() => setActiveTab('charities')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === 'charities' ? 'bg-[#274631] text-[#f2faf4]' : 'text-[#8b9c8e] hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Charities</span>
          </button>
          <button
            id="admin-tab-winners"
            onClick={() => setActiveTab('winners')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === 'winners' ? 'bg-[#274631] text-[#f2faf4]' : 'text-[#8b9c8e] hover:text-white'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Payouts & Proof</span>
          </button>
          <button
            id="admin-tab-analytics"
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
              activeTab === 'analytics' ? 'bg-[#274631] text-[#f2faf4]' : 'text-[#8b9c8e] hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>
        </div>
      </div>

      {/* 1. DRAW ENGINE SURFACE */}
      {activeTab === 'draws' && (
        <div className="space-y-8 animate-fade-in">
          <div className="bg-[#151c17] border border-[#2b3c2f] rounded-xl p-6 sm:p-8 shadow-xl">
            <h3 className="font-serif text-xl font-bold text-[#F4F6F2] mb-2 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" />
              Configure & Simulate Monthly Draw
            </h3>
            <p className="text-xs text-[#8fa092] mb-6">
              Deterministic calculation engine. Run and inspect realistic simulation before publishing to subscribers.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-[#bac5bd] mb-1">
                  Draw Target Month
                </label>
                <input
                  type="month"
                  value={drawMonth}
                  onChange={(e) => setDrawMonth(e.target.value)}
                  className="w-full px-3 py-2 bg-[#101512] border border-[#2b3a2f] rounded-lg text-xs text-[#f1f5f2] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#bac5bd] mb-1">
                  Selection Logic
                </label>
                <select
                  value={drawMethod}
                  onChange={(e) => setDrawMethod(e.target.value as DrawMethod)}
                  className="w-full px-3 py-2 bg-[#101512] border border-[#2b3a2f] rounded-lg text-xs text-[#f1f5f2] focus:outline-none"
                >
                  <option value="algorithmic">Algorithmic (Score Frequency Weighted)</option>
                  <option value="random">Random (Standard Lottery)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#bac5bd] mb-1">
                  Configurable Sub Allocation ($)
                </label>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={allocationPerSub}
                  onChange={(e) => setAllocationPerSub(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#101512] border border-[#2b3a2f] rounded-lg text-xs text-[#f1f5f2] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#bac5bd] mb-1">
                  Carried Rollover In ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={jackpotRolloverIn}
                  onChange={(e) => setJackpotRolloverIn(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#101512] border border-[#2b3a2f] rounded-lg text-xs text-[#f1f5f2] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                id="run-simulation-btn"
                onClick={handleSimulateDraw}
                disabled={simulating}
                className="py-2.5 px-5 rounded-lg bg-[#274631] hover:bg-[#345e41] text-xs font-semibold text-white transition flex items-center gap-2 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{simulating ? 'Computing Algorithmic Simulation...' : 'Run Simulation Preview'}</span>
              </button>
            </div>

            {/* TEST MODE Control */}
            {!draws.some(d => d.month === drawMonth && d.status === 'published') && (
              <div className="mt-6 p-4 rounded-lg bg-[#1a1414] border border-[#3d2a2a]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-1.5 rounded bg-red-900/40 text-red-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-red-200 uppercase tracking-tighter">Test Mode (Developer Override)</h4>
                    <p className="text-[10px] text-red-400/80">Manually set winning numbers for this session only to test winner flows.</p>
                  </div>
                  <div className="ml-auto">
                    <button
                      onClick={() => setTestModeEnabled(!testModeEnabled)}
                      className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition ${
                        testModeEnabled ? 'bg-red-600 text-white shadow-lg shadow-red-900/50' : 'bg-[#2d2121] text-red-400 border border-red-900/50 hover:bg-red-900/20'
                      }`}
                    >
                      {testModeEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>

                {testModeEnabled && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-[10px] font-medium text-red-300/70 mb-1 uppercase tracking-wider">
                      Manual Winning Numbers (5 digits, 1–45, comma-separated)
                    </label>
                    <input
                      type="text"
                      value={manualNumbers}
                      onChange={(e) => setManualNumbers(e.target.value)}
                      placeholder="e.g. 5, 12, 23, 31, 44"
                      className="w-full px-3 py-2 bg-[#120c0c] border border-red-900/30 rounded-lg text-xs text-red-100 placeholder:text-red-900/50 focus:outline-none focus:border-red-600 transition font-mono"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Simulation Preview Output */}
          {simulatedDraw && (
            <div className="bg-[#17221a] border-2 border-[#3d6347] rounded-xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-4 border-b border-[#2d4233] gap-2">
                <div>
                  <span className="px-2.5 py-0.5 rounded bg-amber-900/60 border border-amber-700/60 text-amber-200 text-[11px] font-mono uppercase">
                    Simulation Preview (Unpublished)
                  </span>
                  {(simulatedDraw as any).isTestDraw && (
                    <span className="ml-2 px-2.5 py-0.5 rounded bg-red-900/60 border border-red-700/60 text-red-200 text-[11px] font-mono uppercase animate-pulse">
                      TEST MODE ACTIVE
                    </span>
                  )}
                  <h3 className="font-serif text-2xl font-bold text-[#f2f7f3] mt-2">
                    {simulatedDraw.title}
                  </h3>
                </div>
                <div className="sm:text-right flex gap-6">
                  <div>
                    <span className="text-xs text-[#899f8e] block">Monthly Pool:</span>
                    <span className="font-mono text-lg font-bold text-neutral-300">
                      ${(simulatedDraw.totalPrizePool - simulatedDraw.jackpotRolloverIn).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[#899f8e] block">Total Prize Pool:</span>
                    <span className="font-mono text-2xl font-bold text-emerald-400">
                      ${simulatedDraw.totalPrizePool.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Winning Numbers */}
              <div>
                <span className="text-xs text-[#8ba08f] uppercase tracking-wider block mb-2">
                  Generated Winning Numbers (Range 1–45):
                </span>
                <div className="flex gap-2">
                  {simulatedDraw.winningNumbers.map((n, i) => (
                    <div
                      key={i}
                      className="w-12 h-12 rounded-lg bg-[#111712] border-2 border-emerald-500 flex items-center justify-center font-mono text-lg font-bold text-emerald-300"
                    >
                      {n}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tier breakdowns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-lg bg-[#111612] border border-[#243527]">
                  <div className="font-bold text-amber-300 mb-1 leading-tight">5-Number Match (40% + Rollover)</div>
                  <div className="text-[#d6e0d8] font-mono text-sm mb-1">${simulatedDraw.tiers.fiveMatch.totalAvailable.toLocaleString()}</div>
                  <div className="space-y-0.5 text-[10px] text-[#819985]">
                    <div>Monthly Alloc: ${simulatedDraw.tiers.fiveMatch.allocatedAmount.toLocaleString()}</div>
                    <div>Rollover In: ${simulatedDraw.tiers.fiveMatch.rolloverAmount.toLocaleString()}</div>
                    <div className="pt-1 border-t border-[#1f2b22] text-[#8ce2a3]">
                      Winners: {simulatedDraw.tiers.fiveMatch.winnersCount}
                    </div>
                    <div>Payout: ${simulatedDraw.tiers.fiveMatch.payoutPerWinner.toLocaleString()} ea</div>
                    <div className="mt-1 text-amber-500/80 italic font-mono">
                      Rollover to next: ${simulatedDraw.tiers.fiveMatch.rolledOverToNext.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#111612] border border-[#243527]">
                  <div className="font-bold text-emerald-400 mb-1 leading-tight">4-Number Match (35% Monthly)</div>
                  <div className="text-[#d6e0d8] font-mono text-sm mb-1">${simulatedDraw.tiers.fourMatch.totalAvailable.toLocaleString()}</div>
                  <div className="space-y-0.5 text-[10px] text-[#819985]">
                    <div>Allocated: ${simulatedDraw.tiers.fourMatch.allocatedAmount.toLocaleString()}</div>
                    <div className="pt-1 border-t border-[#1f2b22] text-[#8ce2a3]">
                      Winners: {simulatedDraw.tiers.fourMatch.winnersCount}
                    </div>
                    <div>Payout: ${simulatedDraw.tiers.fourMatch.payoutPerWinner.toLocaleString()} ea</div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#111612] border border-[#243527]">
                  <div className="font-bold text-neutral-300 mb-1 leading-tight">3-Number Match (25% Monthly)</div>
                  <div className="text-[#d6e0d8] font-mono text-sm mb-1">${simulatedDraw.tiers.threeMatch.totalAvailable.toLocaleString()}</div>
                  <div className="space-y-0.5 text-[10px] text-[#819985]">
                    <div>Allocated: ${simulatedDraw.tiers.threeMatch.allocatedAmount.toLocaleString()}</div>
                    <div className="pt-1 border-t border-[#1f2b22] text-[#8ce2a3]">
                      Winners: {simulatedDraw.tiers.threeMatch.winnersCount}
                    </div>
                    <div>Payout: ${simulatedDraw.tiers.threeMatch.payoutPerWinner.toLocaleString()} ea</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#293d2f]">
                <button
                  type="button"
                  onClick={() => setSimulatedDraw(null)}
                  className="px-4 py-2 rounded-lg bg-[#141b16] text-xs text-[#8f9f92] hover:text-white"
                >
                  Discard Simulation
                </button>
                <div className="flex flex-col items-end gap-3">
                  {showTestConfirm && (
                    <div className="bg-amber-950/30 border border-amber-900/50 p-3 rounded-lg mb-2 flex flex-col gap-2 animate-in fade-in slide-in-from-right-2">
                      <p className="text-[10px] text-amber-400 font-medium max-w-[200px]">
                        TEST MODE: Confirm publishing manually overridden numbers?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePublishDraw(true)}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold rounded"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => { setShowTestConfirm(false); setPublishStatus(null); }}
                          className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      id="publish-draw-btn"
                      type="button"
                      onClick={() => {
                        console.log('!!! BUTTON CLICKED !!!');
                        handlePublishDraw();
                      }}
                      disabled={publishing}
                      className={`px-6 py-2.5 rounded-lg text-xs font-bold text-white transition border shadow-lg flex items-center gap-2 ${
                        publishing 
                          ? 'bg-zinc-800 border-zinc-700 cursor-not-allowed' 
                          : 'bg-[#274932] hover:bg-[#345e41] border-[#4a805c]'
                      }`}
                    >
                      <Check className={`w-4 h-4 ${publishing ? 'animate-spin' : ''}`} />
                      <span>{publishing ? 'Publishing...' : 'Publish Official Draw & Notify Winners'}</span>
                    </button>

                    {publishStatus && (
                      <div className={`px-3 py-1 rounded text-[10px] font-mono animate-pulse ${
                        publishStatus.startsWith('Error') || publishStatus.startsWith('CRITICAL')
                          ? 'bg-red-950/40 text-red-400 border border-red-900/40' 
                          : publishStatus.includes('Awaiting') || publishStatus.includes('Confirmation')
                            ? 'bg-amber-950/40 text-amber-400 border border-amber-900/40'
                            : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40'
                      }`}>
                        {publishStatus}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. USER MANAGEMENT SURFACE */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#151c17] border border-[#2b3c2f] rounded-xl p-6 shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif text-lg font-bold text-[#F4F6F2]">
                Registered Platform Subscribers ({usersList.length})
              </h3>
              <button
                onClick={fetchUsers}
                className="text-xs text-emerald-400 hover:underline"
              >
                Refresh Users
              </button>
            </div>

            {loadingUsers ? (
              <div className="py-8 text-center text-xs text-[#7e9282]">Loading user records...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#26372a] text-[#768b7b] uppercase font-mono">
                    <tr>
                      <th className="py-2.5 px-3">Subscriber</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Plan</th>
                      <th className="py-2.5 px-3">Charity %</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f2b22] text-[#d6e0d8]">
                    {usersList.map((u) => (
                      <tr key={u.uid} className="hover:bg-[#19231b]/60">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-white">{u.displayName || 'Unnamed'}</div>
                          <div className="text-[11px] text-[#718475]">{u.email}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                            u.role === 'admin' ? 'bg-amber-950 text-amber-300' : 'bg-[#18261d] text-emerald-300'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-3 capitalize">{u.subscriptionPlan || 'monthly'}</td>
                        <td className="py-3 px-3 font-mono text-emerald-400 font-bold">{u.charityContributionPercent || 10}%</td>
                        <td className="py-3 px-3">
                          <select
                            value={u.subscriptionStatus}
                            onChange={(e) => handleUpdateUserStatus(u.uid, e.target.value as SubscriptionStatus)}
                            className="px-2 py-1 bg-[#101512] border border-[#28382c] rounded text-[11px] text-[#8ce2a3]"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="lapsed">Lapsed</option>
                          </select>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleInspectScores(u)}
                            className="px-2.5 py-1 rounded bg-[#1e2a21] hover:bg-[#27382c] text-[11px] text-[#c0d6c5] transition"
                          >
                            Inspect Scores
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* User scores inspector modal */}
          {selectedUserForScores && (
            <div className="bg-[#162019] border border-[#2f4233] rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-[#28392c]">
                <div>
                  <h4 className="font-serif font-bold text-[#f1f6f2]">
                    Scores for {selectedUserForScores.displayName} ({selectedUserForScores.email})
                  </h4>
                  <span className="text-xs text-[#7d9082]">Admin score editor & delete overrides</span>
                </div>
                <button
                  onClick={() => setSelectedUserForScores(null)}
                  className="text-xs text-[#899c8f] hover:text-white"
                >
                  Close
                </button>
              </div>

              {userScoresList.length === 0 ? (
                <p className="text-xs text-[#7d9082]">No scores found for this user.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {userScoresList.map((s) => (
                    <div key={s.id} className="p-3 rounded-lg bg-[#111713] border border-[#253629] flex items-center justify-between text-xs">
                      <div>
                        <div className="font-mono text-emerald-400 font-bold text-sm">Score: {s.score}</div>
                        <div className="text-[11px] text-[#7d9082]">{s.date}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteUserScore(s.id)}
                        className="p-1 rounded text-[#7d9082] hover:text-rose-400"
                        title="Delete score"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. CHARITY MANAGEMENT SURFACE */}
      {activeTab === 'charities' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#151c17] border border-[#2b3c2f] rounded-xl p-6 shadow-md">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#F4F6F2]">
                  Charity Organizations Directory
                </h3>
                <p className="text-xs text-[#8fa092]">
                  Add, edit, and curate partner charities, impact metrics, and golf events.
                </p>
              </div>
              <button
                id="add-charity-btn"
                onClick={() => {
                  setEditingCharityId(null);
                  setCharityName('');
                  setCharityCategory('');
                  setCharityTagline('');
                  setCharityDescription('');
                  setCharityMission('');
                  setCharityImageUrl('');
                  setCharityFeatured(false);
                  setCharityModalOpen(true);
                }}
                className="py-2 px-3 rounded-lg bg-[#274631] hover:bg-[#345e41] text-xs font-semibold text-white transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Charity</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {charities.map((c) => (
                <div key={c.id} className="p-4 rounded-lg bg-[#111713] border border-[#243629] flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-emerald-400 font-mono uppercase">{c.category}</span>
                        <h4 className="font-serif font-bold text-[#f1f6f2] text-base">{c.name}</h4>
                      </div>
                      <span className="font-mono text-xs text-[#8ce2a3] font-bold">
                        ${c.totalRaised?.toLocaleString() || '0'} Raised
                      </span>
                    </div>
                    <p className="text-xs text-[#8f9f92] mt-2 line-clamp-2">{c.description}</p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[#202f23] flex justify-end gap-2 text-xs">
                    <button
                      onClick={() => {
                        setEditingCharityId(c.id);
                        setCharityName(c.name);
                        setCharityCategory(c.category);
                        setCharityTagline(c.tagline);
                        setCharityDescription(c.description);
                        setCharityMission(c.mission);
                        setCharityImageUrl(c.imageUrl || '');
                        setCharityFeatured(c.featured);
                        setCharityModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded bg-[#1e2a20] hover:bg-[#29392c] text-[#c0d4c5]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCharity(c.id)}
                      className="px-2.5 py-1 rounded bg-[#2c1d1d] hover:bg-[#3d2424] text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. WINNERS & PAYOUTS SURFACE (PRD § 07 & 09) */}
      {activeTab === 'winners' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#151c17] border border-[#2b3c2f] rounded-xl p-6 shadow-md">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#F4F6F2]">
                  Winner Verification & Payout Pipeline
                </h3>
                <p className="text-xs text-[#8fa092]">
                  Inspect scorecard proofs, approve or reject submissions, and mark payment status.
                </p>
              </div>
              <button onClick={fetchWinners} className="text-xs text-emerald-400 hover:underline">
                Refresh Winners
              </button>
            </div>

            {loadingWinners ? (
              <div className="py-8 text-center text-xs text-[#7d9082]">Loading winners...</div>
            ) : winnersList.length === 0 ? (
              <div className="py-8 text-center bg-[#101512] rounded-lg border border-[#253528] text-xs text-[#7d9082]">
                No winners registered yet. Run and publish a draw in the Draw Engine tab!
              </div>
            ) : (
              <div className="space-y-3">
                {winnersList.map((win) => (
                  <div key={win.id} className="p-4 rounded-lg bg-[#111713] border border-[#243528] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#f1f5f2]">{win.userName}</span>
                        <span className="text-[11px] text-[#7e9282]">({win.userEmail})</span>
                        <span className="px-2 py-0.5 rounded bg-[#203125] font-mono text-[11px] text-emerald-300">
                          {win.matchType}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8e9f92] mt-1">
                        Draw: {win.drawTitle || win.drawMonth} · Matched Numbers: [{win.matchedNumbers?.join(', ')}]
                      </div>
                      {win.proofImageData || win.proofUrl ? (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => {
                              const imgWin = window.open('', '_blank');
                              if (imgWin) {
                                imgWin.document.write(`<img src="${win.proofImageData || win.proofUrl}" style="max-width: 100%; height: auto;" />`);
                                imgWin.document.title = `Proof: ${win.userName}`;
                              }
                            }}
                            className="text-xs text-[#8ce2a3] hover:underline flex items-center gap-1"
                          >
                            <span>Inspect Scorecard Proof Image</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          {win.proofNotes && <span className="text-[11px] text-[#718475]">· Notes: {win.proofNotes}</span>}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex sm:flex-col items-end gap-2 text-right">
                      <div className="font-mono text-base font-bold text-emerald-400">
                        ${win.prizeShareAmount}
                      </div>
                      
                      {/* Review Actions */}
                      <div className="flex items-center gap-2">
                        {/* 1. Submitted/Pending Review State */}
                        {(win.proofStatus === 'pending_review' || win.proofStatus === 'Submitted') && (
                          <>
                            <button
                              onClick={async () => {
                                await reviewWinnerProof(win.id, 'approved');
                                fetchWinners();
                              }}
                              className="px-2.5 py-1 rounded bg-[#253e2c] text-emerald-300 hover:bg-[#31533b] font-medium transition"
                            >
                              Approve Proof
                            </button>
                            <button
                              onClick={async () => {
                                await reviewWinnerProof(win.id, 'rejected');
                                fetchWinners();
                              }}
                              className="px-2.5 py-1 rounded bg-[#3b2020] text-rose-300 hover:bg-[#4d2828] font-medium transition"
                            >
                              Reject
                            </button>
                            <span className="px-2 py-1 rounded bg-[#232014] text-amber-300 border border-[#3e381f] font-mono">
                              PAYMENT: PENDING
                            </span>
                          </>
                        )}

                        {/* 2. Approved and Pending Payment State */}
                        {win.proofStatus === 'approved' && win.paymentStatus === 'pending' && (
                          <>
                            <span className="px-2 py-1 rounded bg-[#18261d] text-emerald-300 font-bold border border-[#23422c]">
                              ✓ PROOF APPROVED
                            </span>
                            <button
                              onClick={() => {
                                console.log(`Admin Trace: Triggering payment confirmation modal for winner ID: ${win.id}`);
                                setPaymentConfirmWinner(win);
                              }}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm"
                            >
                              Mark Payment as Paid
                            </button>
                          </>
                        )}

                        {/* 3. Approved and Paid State */}
                        {win.proofStatus === 'approved' && win.paymentStatus === 'paid' && (
                          <>
                            <span className="px-2 py-1 rounded bg-[#18261d] text-emerald-300 font-bold border border-[#23422c]">
                              ✓ PROOF APPROVED
                            </span>
                            <span className="px-2 py-1 rounded bg-emerald-950 text-emerald-400 font-mono font-bold border border-emerald-900/50">
                              ✓ PAYMENT PAID
                            </span>
                          </>
                        )}

                        {/* 4. Rejected State */}
                        {win.proofStatus === 'rejected' && (
                          <span className="px-2 py-1 rounded bg-[#301b1b] text-rose-300 font-bold border border-[#522929]">
                            ✕ PROOF REJECTED
                          </span>
                        )}

                        {/* Initial state (no proof) */}
                        {win.proofStatus === 'none' && (
                          <span className="px-2 py-1 rounded bg-[#1b251e] text-[#7d9082] font-mono">
                            AWAITING PROOF
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. ANALYTICS SURFACE */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-[#151c17] border border-[#2b3c2f]">
              <span className="text-xs text-[#7d9082] uppercase font-mono">Platform Subscribers</span>
              <div className="font-mono text-2xl font-bold text-[#f1f6f2] mt-1">{totalSubscribersCount}</div>
              <span className="text-[11px] text-emerald-400 mt-1 block">Active membership base</span>
            </div>

            <div className="p-5 rounded-xl bg-[#151c17] border border-[#2b3c2f]">
              <span className="text-xs text-[#7d9082] uppercase font-mono">Total Prize Pool Allocated</span>
              <div className="font-mono text-2xl font-bold text-amber-300 mt-1">
                ${totalPrizePoolsCalculated.toLocaleString()}
              </div>
              <span className="text-[11px] text-[#718475] mt-1 block">Monthly draws combined</span>
            </div>

            <div className="p-5 rounded-xl bg-[#151c17] border border-[#2b3c2f]">
              <span className="text-xs text-[#7d9082] uppercase font-mono">Total Charity Raised</span>
              <div className="font-mono text-2xl font-bold text-emerald-400 mt-1">
                ${totalCharityRaisedSum.toLocaleString()}
              </div>
              <span className="text-[11px] text-[#718475] mt-1 block">Across {totalCharitiesCount} causes</span>
            </div>

            <div className="p-5 rounded-xl bg-[#151c17] border border-[#2b3c2f]">
              <span className="text-xs text-[#7d9082] uppercase font-mono">Active Jackpot Rollover</span>
              <div className="font-mono text-2xl font-bold text-[#8ce2a3] mt-1">
                ${jackpotRolloverIn.toLocaleString()}
              </div>
              <span className="text-[11px] text-[#718475] mt-1 block">Carried forward for 5-match</span>
            </div>
          </div>
        </div>
      )}

      {/* CHARITY MODAL (CRUD) */}
      {charityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0d0b]/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#161c18] border border-[#2e3e32] rounded-xl shadow-2xl p-6 text-[#E8EAE6] relative">
            <button
              onClick={() => setCharityModalOpen(false)}
              className="absolute top-4 right-4 text-[#88988c] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif text-xl font-bold text-[#f2f6f3] mb-4">
              {editingCharityId ? 'Edit Charity Partner' : 'Create New Charity Partner'}
            </h3>

            <form onSubmit={handleSaveCharity} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#bac5bd] mb-1">Organization Name</label>
                <input
                  type="text"
                  required
                  value={charityName}
                  onChange={(e) => setCharityName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#101512] border border-[#2b3a2f] rounded-lg text-[#f1f5f2]"
                />
              </div>

              <div>
                <label className="block text-[#bac5bd] mb-1">Category</label>
                <input
                  type="text"
                  required
                  value={charityCategory}
                  onChange={(e) => setCharityCategory(e.target.value)}
                  placeholder="e.g. Youth & Education / Veteran Wellness"
                  className="w-full px-3 py-2 bg-[#101512] border border-[#2b3a2f] rounded-lg text-[#f1f5f2]"
                />
              </div>

              <div>
                <label className="block text-[#bac5bd] mb-1">Tagline</label>
                <input
                  type="text"
                  required
                  value={charityTagline}
                  onChange={(e) => setCharityTagline(e.target.value)}
                  className="w-full px-3 py-2 bg-[#101512] border border-[#2b3a2f] rounded-lg text-[#f1f5f2]"
                />
              </div>

              <div>
                <label className="block text-[#bac5bd] mb-1">Mission Statement</label>
                <textarea
                  rows={2}
                  required
                  value={charityMission}
                  onChange={(e) => setCharityMission(e.target.value)}
                  className="w-full px-3 py-2 bg-[#101512] border border-[#2b3a2f] rounded-lg text-[#f1f5f2]"
                />
              </div>

              <div>
                <label className="block text-[#bac5bd] mb-1">Full Description</label>
                <textarea
                  rows={3}
                  required
                  value={charityDescription}
                  onChange={(e) => setCharityDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#101512] border border-[#2b3a2f] rounded-lg text-[#f1f5f2]"
                />
              </div>

              <div>
                <label className="block text-[#bac5bd] mb-1">Photo / Media URL</label>
                <input
                  type="url"
                  value={charityImageUrl}
                  onChange={(e) => setCharityImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-[#101512] border border-[#2b3a2f] rounded-lg text-[#f1f5f2]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured-charity-cb"
                  checked={charityFeatured}
                  onChange={(e) => setCharityFeatured(e.target.checked)}
                  className="accent-[#5fa874]"
                />
                <label htmlFor="featured-charity-cb" className="text-[#bac5bd]">
                  Feature on public homepage
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCharityModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-[#141b16] text-[#8f9f92]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-[#274631] text-white font-bold"
                >
                  Save Charity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {paymentConfirmWinner && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-[#1a231e] border border-[#2d4d38] p-6 rounded-xl max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-emerald-400">
              <div className="p-2 rounded-full bg-emerald-500/10">
                <Coins size={24} />
              </div>
              <h3 className="text-xl font-bold">Confirm Payout</h3>
            </div>
            
            <p className="text-[#bac5bd] mb-6 leading-relaxed">
              Are you sure you want to mark <span className="text-white font-bold">${paymentConfirmWinner.prizeShareAmount}</span> as <span className="text-emerald-400 font-bold uppercase tracking-wider">Paid</span> for <span className="text-white font-bold">{paymentConfirmWinner.userName}</span>?
              <br /><br />
              <span className="text-rose-400/80 text-sm font-medium">This action is permanent and cannot be undone.</span>
            </p>

            <div className="flex gap-3">
              <button
                disabled={paying}
                onClick={() => setPaymentConfirmWinner(null)}
                className="flex-1 py-3 rounded-lg bg-[#141b16] text-[#8f9f92] font-semibold hover:bg-[#1c261f] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={paying}
                onClick={async () => {
                  setPaying(true);
                  try {
                    console.log(`Admin Trace: Finalizing payment for winner ${paymentConfirmWinner.id}`);
                    if (!paymentConfirmWinner.id) {
                      throw new Error("Winner ID is missing.");
                    }
                    await markWinnerPayout(paymentConfirmWinner.id, 'paid');
                    console.log(`Admin Trace: Payment persisted successfully.`);
                    
                    // Refresh UI
                    await fetchWinners();
                    setPaymentConfirmWinner(null);
                    
                    // Visual feedback
                    confetti({
                      particleCount: 100,
                      spread: 70,
                      origin: { y: 0.6 },
                      colors: ['#10b981', '#059669', '#34d399']
                    });
                  } catch (err: any) {
                    console.error('Payout failed:', err);
                    alert(`Error: ${err.message}`);
                  } finally {
                    setPaying(false);
                  }
                }}
                className="flex-1 py-3 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 relative overflow-hidden"
              >
                {paying ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
