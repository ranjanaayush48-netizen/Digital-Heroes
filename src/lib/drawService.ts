import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  MonthlyDraw, 
  DrawMethod, 
  WinnerRecord, 
  DrawTierResult, 
  GolfScore, 
  UserProfile 
} from '../types';
import { INITIAL_DRAWS } from './demoData';

/**
 * PRD § 06 & § 07 DRAW & PRIZE ENGINE
 * 
 * Rules:
 * - 5-number match: 40% of pool
 * - 4-number match: 35% of pool
 * - 3-number match: 25% of pool
 * - Each tier split equally among multiple winners
 * - 5-number jackpot rolls over if unclaimed (carries forward)
 * - 4-number & 3-number do NOT roll over
 * - Active subscriber count determines prize pool based on configurable allocation
 *   (e.g., $10 / subscriber/month)
 * - Draw Methods:
 *   1. "random": 5 unique numbers randomly chosen from 1-45
 *   2. "algorithmic": weighted by frequency of user scores submitted in that period
 */

export const generateRandomNumbers = (count = 5, min = 1, max = 45): number[] => {
  const selected = new Set<number>();
  while (selected.size < count) {
    const num = Math.floor(Math.random() * (max - min + 1)) + min;
    selected.add(num);
  }
  return Array.from(selected).sort((a, b) => a - b);
};

export const generateAlgorithmicNumbers = (userScores: number[], count = 5, min = 1, max = 45): number[] => {
  // Build frequency map
  const freqMap = new Map<number, number>();
  for (let i = min; i <= max; i++) {
    freqMap.set(i, 1); // Laplace base smoothing so every number has a chance
  }
  userScores.forEach(s => {
    if (s >= min && s <= max) {
      freqMap.set(s, (freqMap.get(s) || 1) + 3);
    }
  });

  const selected = new Set<number>();
  while (selected.size < count) {
    // Weighted selection
    let totalWeight = 0;
    freqMap.forEach((weight, num) => {
      if (!selected.has(num)) totalWeight += weight;
    });

    let randomVal = Math.random() * totalWeight;
    for (const [num, weight] of freqMap.entries()) {
      if (selected.has(num)) continue;
      randomVal -= weight;
      if (randomVal <= 0) {
        selected.add(num);
        break;
      }
    }
  }

  return Array.from(selected).sort((a, b) => a - b);
};

export interface SimulateDrawParams {
  month: string; // YYYY-MM
  drawMethod: DrawMethod;
  customWinningNumbers?: number[];
  monthlyAllocationPerSub?: number; // default $10
  jackpotRolloverIn?: number;
}

export const simulateMonthlyDraw = async (params: SimulateDrawParams): Promise<MonthlyDraw> => {
  const allocationPerSub = params.monthlyAllocationPerSub || 10;
  
  // 1. Fetch active subscribers
  const usersSnap = await getDocs(query(collection(db, 'users')));
  const subscribers: UserProfile[] = [];
  const subscriberScoresMap = new Map<string, number[]>();
  const allSubScores: number[] = [];

  for (const userDoc of usersSnap.docs) {
    const user = userDoc.data() as UserProfile;
    if (user.subscriptionStatus === 'active') {
      subscribers.push(user);
      
      // Fetch user's latest scores (up to 5)
      const scoresSnap = await getDocs(
        query(collection(db, 'users', user.uid, 'scores'), orderBy('date', 'desc'))
      );
      const scoresList: number[] = [];
      scoresSnap.forEach(sDoc => {
        const s = sDoc.data() as GolfScore;
        scoresList.push(s.score);
        allSubScores.push(s.score);
      });
      subscriberScoresMap.set(user.uid, scoresList);
    }
  }

  const activeCount = Math.max(subscribers.length, 1); // at least 1 for math
  const totalPrizePool = activeCount * allocationPerSub;

  // 2. Find previous published draw jackpot rollover
  let rolloverIn = params.jackpotRolloverIn ?? 0;
  
  // If no manual rollover provided (or is 0), try to find the last published draw preceding this month
  if (params.jackpotRolloverIn === undefined || params.jackpotRolloverIn === 0) {
    const prevDrawsSnap = await getDocs(
      query(
        collection(db, 'draws'), 
        where('status', '==', 'published'), 
        where('month', '<', params.month),
        orderBy('month', 'desc')
      )
    );
    if (!prevDrawsSnap.empty) {
      const lastDraw = prevDrawsSnap.docs[0].data() as MonthlyDraw;
      rolloverIn = lastDraw.jackpotRolloverOut || 0;
    } else if (params.jackpotRolloverIn === undefined) {
      rolloverIn = 2500; // default initial seed jackpot
    }
  }

  // 3. Generate winning numbers if not manually provided
  let winningNumbers: number[];
  if (params.customWinningNumbers && params.customWinningNumbers.length === 5) {
    winningNumbers = [...params.customWinningNumbers].sort((a, b) => a - b);
  } else if (params.drawMethod === 'algorithmic') {
    winningNumbers = generateAlgorithmicNumbers(allSubScores, 5, 1, 45);
  } else {
    winningNumbers = generateRandomNumbers(5, 1, 45);
  }

  // 4. Calculate pool distribution
  // PRD: Calculate the current month's prize pool first
  const monthlyContribution = activeCount * allocationPerSub;
  
  // PRD: 5-match receives 40% of the current month's pool
  const pool5MonthlyAlloc = Math.floor(monthlyContribution * 0.40);
  // PRD: 4-match receives 35%
  const pool4MonthlyAlloc = Math.floor(monthlyContribution * 0.35);
  // PRD: 3-match receives 25% (and ensures mathematical reconciliation to 100%)
  const pool3MonthlyAlloc = monthlyContribution - pool5MonthlyAlloc - pool4MonthlyAlloc;

  // PRD: Add any carried rollover ONLY to the 5-match jackpot
  const pool5Total = pool5MonthlyAlloc + rolloverIn;
  const pool4Total = pool4MonthlyAlloc;
  const pool3Total = pool3MonthlyAlloc;

  // 5. Evaluate subscribers' scores against winning numbers
  const fiveWinners: WinnerRecord[] = [];
  const fourWinners: WinnerRecord[] = [];
  const threeWinners: WinnerRecord[] = [];

  subscribers.forEach(sub => {
    const scores = subscriberScoresMap.get(sub.uid) || [];
    // User numbers are unique set of their 5 scores
    const userNumbers = Array.from(new Set(scores));
    const matched = userNumbers.filter(n => winningNumbers.includes(n));
    const matchCount = matched.length;

    if (matchCount >= 5) {
      fiveWinners.push({
        userId: sub.uid,
        userEmail: sub.email,
        userName: sub.displayName || 'Subscriber',
        matchType: '5-number',
        matchCount: 5,
        matchedNumbers: matched,
        prizeShareAmount: 0, // computed below
        proofStatus: 'none',
        paymentStatus: 'pending'
      });
    } else if (matchCount === 4) {
      fourWinners.push({
        userId: sub.uid,
        userEmail: sub.email,
        userName: sub.displayName || 'Subscriber',
        matchType: '4-number',
        matchCount: 4,
        matchedNumbers: matched,
        prizeShareAmount: 0,
        proofStatus: 'none',
        paymentStatus: 'pending'
      });
    } else if (matchCount === 3) {
      threeWinners.push({
        userId: sub.uid,
        userEmail: sub.email,
        userName: sub.displayName || 'Subscriber',
        matchType: '3-number',
        matchCount: 3,
        matchedNumbers: matched,
        prizeShareAmount: 0,
        proofStatus: 'none',
        paymentStatus: 'pending'
      });
    }
  });

  // Calculate payouts
  let rolloverOut = 0;
  let payout5 = 0;
  if (fiveWinners.length > 0) {
    payout5 = Math.round(pool5Total / fiveWinners.length);
    fiveWinners.forEach(w => w.prizeShareAmount = payout5);
    rolloverOut = 0;
  } else {
    // 5-match jackpot carries forward if unclaimed!
    rolloverOut = pool5Total;
  }

  let payout4 = 0;
  if (fourWinners.length > 0) {
    payout4 = Math.round(pool4Total / fourWinners.length);
    fourWinners.forEach(w => w.prizeShareAmount = payout4);
  }

  let payout3 = 0;
  if (threeWinners.length > 0) {
    payout3 = Math.round(pool3Total / threeWinners.length);
    threeWinners.forEach(w => w.prizeShareAmount = payout3);
  }

  const [year, month] = params.month.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const drawDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const simulatedDraw: MonthlyDraw = {
    id: `draw-${params.month}`,
    month: params.month,
    title: `${new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })} Prize Draw`,
    drawDate,
    status: 'simulated',
    drawMethod: params.drawMethod,
    winningNumbers,
    activeSubscribersCount: activeCount,
    monthlyAllocationPerSub: allocationPerSub,
    totalPrizePool: monthlyContribution + rolloverIn,
    jackpotRolloverIn: rolloverIn,
    jackpotRolloverOut: rolloverOut,
    tiers: {
      fiveMatch: {
        matchType: '5-number',
        poolSharePercent: 40,
        allocatedAmount: pool5MonthlyAlloc,
        rolloverAmount: rolloverIn,
        totalAvailable: pool5Total,
        winnersCount: fiveWinners.length,
        payoutPerWinner: payout5,
        winners: fiveWinners,
        rolledOverToNext: rolloverOut
      },
      fourMatch: {
        matchType: '4-number',
        poolSharePercent: 35,
        allocatedAmount: pool4MonthlyAlloc,
        rolloverAmount: 0,
        totalAvailable: pool4Total,
        winnersCount: fourWinners.length,
        payoutPerWinner: payout4,
        winners: fourWinners,
        rolledOverToNext: 0
      },
      threeMatch: {
        matchType: '3-number',
        poolSharePercent: 25,
        allocatedAmount: pool3MonthlyAlloc,
        rolloverAmount: 0,
        totalAvailable: pool3Total,
        winnersCount: threeWinners.length,
        payoutPerWinner: payout3,
        winners: threeWinners,
        rolledOverToNext: 0
      }
    },
    simulatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  return simulatedDraw;
};

export const publishMonthlyDraw = async (draw: MonthlyDraw): Promise<void> => {
  console.log('drawService Trace: Starting publishMonthlyDraw for', draw.id);
  const publishedDraw: MonthlyDraw = {
    ...draw,
    status: 'published',
    publishedAt: new Date().toISOString()
  };

  try {
    console.log('drawService Trace: Writing to draws collection...', draw.id);
    const drawRef = doc(db, 'draws', draw.id);
    await setDoc(drawRef, publishedDraw);
    console.log('drawService Trace: Draw document successfully written to Firestore');
  } catch (error: any) {
    console.error('drawService Trace: FATAL ERROR writing draw doc:', error);
    console.error('drawService Trace: Error code:', error?.code);
    console.error('drawService Trace: Error message:', error?.message);
    throw error;
  }

  // Store winner records in a top-level winners collection for easy auditing and verification flow
  const allWinners = [
    ...draw.tiers.fiveMatch.winners,
    ...draw.tiers.fourMatch.winners,
    ...draw.tiers.threeMatch.winners
  ];

  console.log(`drawService Trace: Preparing to write ${allWinners.length} winner records...`);
  
  let successCount = 0;
  for (const winner of allWinners) {
    try {
      const winnerId = `${draw.id}_${winner.userId}`;
      console.log(`drawService Trace: Writing winner record for ${winner.userId} (ID: ${winnerId})`);
      const winnerRef = doc(db, 'winners', winnerId);
      await setDoc(winnerRef, {
        ...winner,
        drawId: draw.id,
        drawMonth: draw.month,
        drawTitle: draw.title,
        winningNumbers: draw.winningNumbers,
        createdAt: new Date().toISOString()
      }, { merge: true });
      successCount++;
    } catch (error: any) {
      console.error(`drawService Trace: ERROR writing winner record ${winner.userId}:`, error);
      console.error('drawService Trace: Error details:', error?.code, error?.message);
      // We continue to other winners even if one fails
    }
  }
  
  console.log(`drawService Trace: Finished writing winner records. Success: ${successCount}/${allWinners.length}`);
  console.log('drawService Trace: publishMonthlyDraw complete');
};

export const getPublishedDraws = async (): Promise<MonthlyDraw[]> => {
  try {
    const q = query(
      collection(db, 'draws'), 
      where('status', '==', 'published'),
      orderBy('drawDate', 'desc')
    );
    const snap = await getDocs(q);
    const draws: MonthlyDraw[] = [];
    snap.forEach(docSnap => {
      draws.push({ id: docSnap.id, ...(docSnap.data() as Omit<MonthlyDraw, 'id'>) });
    });

    // If empty, return initial demo draw
    if (draws.length === 0) {
      return INITIAL_DRAWS;
    }
    return draws;
  } catch (error) {
    console.error('drawService: Error fetching published draws:', error);
    // Return initial draws as fallback to prevent app crash
    return INITIAL_DRAWS;
  }
};

export const getUserWins = async (userId: string) => {
  const q = query(collection(db, 'winners'), where('userId', '==', userId));
  const snap = await getDocs(q);
  const wins: any[] = [];
  
  for (const docSnap of snap.docs) {
    const data = docSnap.data() as WinnerRecord;
    
    // Silent cleanup for broken fallback (Data URI proof) created by legacy code
    // We only reset if it's in a 'pending_review' state with a data URI, which shouldn't exist in the new flow
    const isBrokenFallback = data.proofStatus === 'pending_review' && 
                             (data.proofUrl?.startsWith('data:') || data.proofImageData?.startsWith('data:')) &&
                             !data.proofFileName; // New flow always sets fileName

    if (isBrokenFallback) {
      console.log(`drawService: Cleaning up broken fallback proof for winner ${docSnap.id}`);
      await updateDoc(doc(db, 'winners', docSnap.id), {
        proofUrl: null,
        proofImageData: null,
        proofStatus: 'none',
        proofNotes: '',
        proofFileName: null,
        proofContentType: null,
        proofSubmittedAt: null,
        updatedAt: new Date().toISOString()
      });
      wins.push({ ...data, id: docSnap.id, proofStatus: 'none', proofUrl: null, proofImageData: null });
    } else {
      wins.push({ ...data, id: docSnap.id });
    }
  }
  return wins;
};

export const updateWinnerProof = async (
  winnerId: string, 
  proofData: {
    imageData: string;
    fileName: string;
    contentType: string;
    notes?: string;
  }
) => {
  await updateDoc(doc(db, 'winners', winnerId), {
    proofImageData: proofData.imageData,
    proofFileName: proofData.fileName,
    proofContentType: proofData.contentType,
    proofNotes: proofData.notes || '',
    proofStatus: 'Submitted', // PRD requirement: status = "Submitted"
    proofSubmittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
};

// Simplified review function to handle all submission statuses
export const reviewWinnerProof = async (winnerId: string, status: 'approved' | 'rejected', adminNotes?: string) => {
  await updateDoc(doc(db, 'winners', winnerId), {
    proofStatus: status,
    adminNotes: adminNotes || '',
    updatedAt: new Date().toISOString()
  });
};

export const markWinnerPayout = async (winnerId: string, paymentStatus: 'pending' | 'paid') => {
  await updateDoc(doc(db, 'winners', winnerId), {
    paymentStatus,
    paidAt: paymentStatus === 'paid' ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString()
  });
};

export const getAllWinners = async () => {
  const q = query(collection(db, 'winners'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  const winners: any[] = [];
  
  for (const docSnap of snap.docs) {
    const data = docSnap.data() as WinnerRecord;
    
    // Silent cleanup for broken fallback (Data URI proof) created by legacy code
    const isBrokenFallback = data.proofStatus === 'pending_review' && 
                             (data.proofUrl?.startsWith('data:') || data.proofImageData?.startsWith('data:')) &&
                             !data.proofFileName;

    if (isBrokenFallback) {
      console.log(`drawService: Cleaning up broken fallback proof for winner ${docSnap.id} in admin view`);
      await updateDoc(doc(db, 'winners', docSnap.id), {
        proofUrl: null,
        proofImageData: null,
        proofStatus: 'none',
        proofNotes: '',
        proofFileName: null,
        proofContentType: null,
        proofSubmittedAt: null,
        updatedAt: new Date().toISOString()
      });
      winners.push({ ...data, id: docSnap.id, proofStatus: 'none', proofUrl: null, proofImageData: null });
    } else {
      winners.push({ ...data, id: docSnap.id });
    }
  }
  return winners;
};
