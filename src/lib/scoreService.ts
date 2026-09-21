import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  writeBatch 
} from 'firebase/firestore';
import { db } from './firebase';
import { GolfScore } from '../types';

/**
 * PRD § 05 SCORE MANAGEMENT SYSTEM:
 * - Stableford scores from 1–45
 * - Date required
 * - Only one score entry is permitted per date. Duplicate scores for same date not allowed
 *   (existing entry may only be edited or deleted).
 * - Maximum 5 scores retained at any time.
 * - A new score replaces the oldest stored score automatically when limit is exceeded.
 * - Scores display in reverse chronological order (most recent first).
 */

export const getScores = async (userId: string): Promise<GolfScore[]> => {
  const scoresRef = collection(db, 'users', userId, 'scores');
  // Order by date descending (reverse chronological)
  const q = query(scoresRef, orderBy('date', 'desc'));
  const snap = await getDocs(q);
  const scores: GolfScore[] = [];
  snap.forEach(docSnap => {
    scores.push({ id: docSnap.id, ...(docSnap.data() as Omit<GolfScore, 'id'>) });
  });
  return scores;
};

export const addOrUpdateScore = async (
  userId: string,
  scoreValue: number,
  date: string, // YYYY-MM-DD
  courseName?: string,
  notes?: string
): Promise<{ success: boolean; message?: string }> => {
  // 1. Validation
  if (scoreValue < 1 || scoreValue > 45 || isNaN(scoreValue)) {
    throw new Error('Score must be between 1 and 45 Stableford points.');
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Valid date (YYYY-MM-DD) is required.');
  }

  const scoresRef = collection(db, 'users', userId, 'scores');

  // Check if score exists for this date
  const dateQuery = query(scoresRef, where('date', '==', date));
  const dateSnap = await getDocs(dateQuery);

  if (!dateSnap.empty) {
    // Existing date entry - update the score for this date
    const existingDoc = dateSnap.docs[0];
    await updateDoc(doc(db, 'users', userId, 'scores', existingDoc.id), {
      score: scoreValue,
      courseName: courseName || '',
      notes: notes || '',
      updatedAt: new Date().toISOString()
    });
    return { success: true, message: 'Updated existing score for this date.' };
  }

  // New date: Check total scores count
  const allScoresSnap = await getDocs(query(scoresRef, orderBy('date', 'asc')));
  const currentScores = allScoresSnap.docs;

  const batch = writeBatch(db);

  // If already at 5 or more scores, remove the oldest to enforce maximum 5 retained
  if (currentScores.length >= 5) {
    // Find the oldest record (first item when ordered by date asc)
    const oldestDoc = currentScores[0];
    batch.delete(doc(db, 'users', userId, 'scores', oldestDoc.id));
  }

  // Create new score doc
  const newScoreRef = doc(scoresRef);
  batch.set(newScoreRef, {
    id: newScoreRef.id,
    userId,
    score: scoreValue,
    date,
    courseName: courseName || '',
    notes: notes || '',
    createdAt: new Date().toISOString()
  });

  await batch.commit();
  return { success: true, message: 'Score added successfully.' };
};

export const editScore = async (
  userId: string,
  scoreId: string,
  newScore: number,
  newDate: string,
  courseName?: string,
  notes?: string
): Promise<void> => {
  if (newScore < 1 || newScore > 45) {
    throw new Error('Score must be between 1 and 45 Stableford points.');
  }
  if (!newDate) {
    throw new Error('Date is required.');
  }

  // If changing date, ensure no other score has this date
  const scoresRef = collection(db, 'users', userId, 'scores');
  const dateQuery = query(scoresRef, where('date', '==', newDate));
  const dateSnap = await getDocs(dateQuery);

  for (const docSnap of dateSnap.docs) {
    if (docSnap.id !== scoreId) {
      throw new Error(`A score already exists for date ${newDate}. Multiple scores on the same date are not allowed.`);
    }
  }

  await updateDoc(doc(db, 'users', userId, 'scores', scoreId), {
    score: newScore,
    date: newDate,
    courseName: courseName || '',
    notes: notes || '',
    updatedAt: new Date().toISOString()
  });
};

export const deleteScore = async (userId: string, scoreId: string): Promise<void> => {
  await deleteDoc(doc(db, 'users', userId, 'scores', scoreId));
};
