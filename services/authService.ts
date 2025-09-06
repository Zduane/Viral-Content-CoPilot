// FIX: The firebase v9 modular imports were failing. Switched to firebase v8 compatible imports and API calls.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { auth } from '../firebaseConfig';

// Re-define types for v8 compatibility
type User = firebase.User;
type UserCredential = firebase.auth.UserCredential;

const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export const signUpWithEmail = (email, password): Promise<UserCredential> => {
  return auth.createUserWithEmailAndPassword(email, password);
};

export const signInWithEmail = (email, password): Promise<UserCredential> => {
  return auth.signInWithEmailAndPassword(email, password);
};

export const signInWithGoogle = (): Promise<void> => {
  // FIX: Switched from signInWithPopup to signInWithRedirect to support sandboxed environments like iframes.
  return auth.signInWithRedirect(googleProvider);
};

export const signOutUser = (): Promise<void> => {
  return auth.signOut();
};

export const onAuthStateChangedListener = (callback: (user: User | null) => void) => {
  return auth.onAuthStateChanged(callback);
};