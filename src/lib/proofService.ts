import { auth } from './firebase';

export interface UploadProofParams {
  winnerId: string;
  file: File;
  notes?: string;
}

export const uploadProof = async (params: UploadProofParams): Promise<{ success: boolean; publicId: string }> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  const idToken = await user.getIdToken();
  const formData = new FormData();
  formData.append('proof', params.file);
  formData.append('winnerId', params.winnerId);
  if (params.notes) {
    formData.append('notes', params.notes);
  }

  const response = await fetch('/api/proofs/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload proof');
  }

  return await response.json();
};

export const getProofSignedUrl = async (winnerId: string): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');

  const idToken = await user.getIdToken();
  const response = await fetch(`/api/proofs/${winnerId}/view`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${idToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get proof URL');
  }

  const data = await response.json();
  return data.url;
};
