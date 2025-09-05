
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { User } from 'firebase/auth';
import type { UserProfile } from '../types';

export const createUserProfileDocument = async (userAuth: User, additionalData: { fullName?: string } = {}) => {
  if (!userAuth) return;

  const userDocRef = doc(db, 'users', userAuth.uid);

  const snapshot = await getDoc(userDocRef);

  if (!snapshot.exists()) {
    const { displayName, email } = userAuth;
    const createdAt = new Date();

    try {
      await setDoc(userDocRef, {
        fullName: displayName || additionalData.fullName || 'New User',
        email,
        createdAt: serverTimestamp(),
        ...additionalData,
      });
    } catch (error) {
      console.error('Error creating user document:', error);
      throw error;
    }
  }

  return userDocRef;
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    if (!uid) return null;
    const userDocRef = doc(db, 'users', uid);
    const snapshot = await getDoc(userDocRef);

    if (snapshot.exists()) {
        const data = snapshot.data();
        return {
            fullName: data.fullName,
            email: data.email,
            createdAt: data.createdAt?.toDate(),
        } as UserProfile;
    } else {
        console.warn(`No profile found for user with ID: ${uid}`);
        return null;
    }
};