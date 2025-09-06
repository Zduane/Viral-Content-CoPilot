import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  updateDoc,
  increment,
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
    
    // Default data for a new user profile, including subscription info
    const newUserProfile: Omit<UserProfile, 'createdAt'> = {
      fullName: displayName || additionalData.fullName || 'New User',
      email: email!,
      subscriptionTier: 'free',
      subscriptionStatus: 'active',
      usage: {
        analyses: 0,
        scripts: 0,
        videos: 0,
        influencerGenerations: 0,
        voiceDesigns: 0,
      },
    };

    try {
      await setDoc(userDocRef, {
        ...newUserProfile,
        createdAt: serverTimestamp(),
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
        // Return the full profile, including subscription and usage data
        return {
            fullName: data.fullName,
            email: data.email,
            createdAt: data.createdAt?.toDate(),
            subscriptionTier: data.subscriptionTier || 'free',
            subscriptionStatus: data.subscriptionStatus || 'active',
            usage: { 
                analyses: 0, 
                scripts: 0, 
                videos: 0, 
                influencerGenerations: 0, 
                voiceDesigns: 0, 
                ...data.usage 
            },
        } as UserProfile;
    } else {
        console.warn(`No profile found for user with ID: ${uid}`);
        return null;
    }
};

export const updateUserUsage = async (uid: string, feature: keyof UserProfile['usage']): Promise<UserProfile['usage']> => {
    if (!uid) throw new Error("User ID is required to update usage.");
    const userDocRef = doc(db, 'users', uid);
    
    try {
        await updateDoc(userDocRef, {
            [`usage.${feature}`]: increment(1)
        });

        const updatedProfile = await getUserProfile(uid);
        if (!updatedProfile) throw new Error("Could not retrieve updated user profile.");

        return updatedProfile.usage;
    } catch (error) {
        console.error(`Error updating usage for ${feature}:`, error);
        throw error;
    }
};