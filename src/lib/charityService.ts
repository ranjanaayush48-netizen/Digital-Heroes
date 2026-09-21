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
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';
import { Charity, DonationRecord } from '../types';

export const getCharities = async (): Promise<Charity[]> => {
  const q = query(collection(db, 'charities'), orderBy('name', 'asc'));
  const snap = await getDocs(q);
  const charities: Charity[] = [];
  snap.forEach(docSnap => {
    charities.push({ id: docSnap.id, ...(docSnap.data() as Omit<Charity, 'id'>) });
  });
  return charities;
};

export const getCharityById = async (id: string): Promise<Charity | null> => {
  const docRef = doc(db, 'charities', id);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return { id: snap.id, ...(snap.data() as Omit<Charity, 'id'>) };
  }
  return null;
};

export const createCharity = async (data: Omit<Charity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Charity> => {
  const newRef = doc(collection(db, 'charities'));
  const newCharity: Charity = {
    ...data,
    id: newRef.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await setDoc(newRef, newCharity);
  return newCharity;
};

export const updateCharity = async (id: string, updates: Partial<Charity>): Promise<void> => {
  await updateDoc(doc(db, 'charities', id), {
    ...updates,
    updatedAt: new Date().toISOString()
  });
};

export const deleteCharity = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'charities', id));
};

export const recordDonation = async (
  charityId: string, 
  charityName: string, 
  amount: number, 
  donorName: string, 
  donorEmail: string,
  message?: string,
  userId?: string
): Promise<DonationRecord> => {
  if (amount <= 0) throw new Error('Donation amount must be greater than zero.');
  const newRef = doc(collection(db, 'donations'));
  const record: DonationRecord = {
    id: newRef.id,
    charityId,
    charityName,
    amount,
    donorName,
    donorEmail,
    message: message || '',
    userId,
    createdAt: new Date().toISOString(),
    status: 'completed'
  };
  await setDoc(newRef, record);

  // Increment totalRaised on charity
  try {
    const charity = await getCharityById(charityId);
    if (charity) {
      await updateDoc(doc(db, 'charities', charityId), {
        totalRaised: (charity.totalRaised || 0) + amount,
        supporterCount: (charity.supporterCount || 0) + 1
      });
    }
  } catch (err) {
    console.warn('Could not increment charity totalRaised:', err);
  }

  return record;
};

export const getDonations = async (): Promise<DonationRecord[]> => {
  const q = query(collection(db, 'donations'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  const items: DonationRecord[] = [];
  snap.forEach(docSnap => {
    items.push({ id: docSnap.id, ...(docSnap.data() as Omit<DonationRecord, 'id'>) });
  });
  return items;
};
