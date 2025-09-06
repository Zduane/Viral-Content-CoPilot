// FIX: The firebase v9 modular imports were failing. Switched to firebase v8 compatible imports and API calls.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { db } from '../firebaseConfig';
import type { User, UserProfile } from '../types';


export const createUserProfileDocument = async (userAuth: User, additionalData: { fullName?: string } = {}) => {
  if (!userAuth) return;

  const userDocRef = db.collection('users').doc(userAuth.uid);
  const snapshot = await userDocRef.get();

  if (!snapshot.exists) {
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
      await userDocRef.set({
        ...newUserProfile,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
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
    const userDocRef = db.collection('users').doc(uid);
    const snapshot = await userDocRef.get();

    if (snapshot.exists) {
        const data = snapshot.data()!;
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
    const userDocRef = db.collection('users').doc(uid);
    
    try {
        await userDocRef.update({
            [`usage.${feature}`]: firebase.firestore.FieldValue.increment(1)
        });

        const updatedProfile = await getUserProfile(uid);
        if (!updatedProfile) throw new Error("Could not retrieve updated user profile.");

        return updatedProfile.usage;
    } catch (error) {
        console.error(`Error updating usage for ${feature}:`, error);
        throw error;
    }
};