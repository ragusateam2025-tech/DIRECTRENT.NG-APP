import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
} from '@react-native-firebase/auth';
import { doc, getDoc, getDocFromServer, setDoc } from '@react-native-firebase/firestore';
import { auth, db, COLLECTIONS } from '../lib/firebase';
import type { UserProfile, UserRole } from '../types';

interface AuthContextValue {
  profile: UserProfile | null;
  /** True while the initial session check is in flight. */
  initialising: boolean;
  signUp: (fullName: string, email: string, password: string) => Promise<void>;
  logIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
  setRole: (role: UserRole) => Promise<void>;
  /** Partial edit of the user's own details. Identity fields are not editable. */
  updateDetails: (changes: { fullName?: string; phone?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}

/** Turns a Firebase auth error code into something a person can act on. */
export function friendlyAuthError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email already has an account. Try logging in instead.';
    case 'auth/invalid-email':
      return 'That email address does not look right.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email or password is incorrect.';
    case 'auth/network-request-failed':
      return 'No internet connection. Check your network and try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.';
    case 'app/database-unreachable':
      return 'Account created, but the database rejected it. Check your Firestore security rules.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initialising, setInitialising] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!user) {
        setProfile(null);
        setInitialising(false);
        return;
      }

      try {
        const ref = doc(db, COLLECTIONS.users, user.uid);
        const snapshot = await getDoc(ref);

        if (snapshot.exists()) {
          setProfile(snapshot.data() as UserProfile);
        } else {
          // Auth account exists but the profile document does not yet.
          const fresh: UserProfile = {
            uid: user.uid,
            fullName: user.displayName ?? '',
            email: user.email ?? '',
            role: 'tenant',
            roleChosen: false,
            createdAt: Date.now(),
          };
          await setDoc(ref, fresh);
          setProfile(fresh);
        }
      } catch {
        // Firestore unreachable or rules deny the read. Fall back to a
        // session-only profile so the user is not stranded on a blank screen.
        setProfile({
          uid: user.uid,
          fullName: user.displayName ?? '',
          email: user.email ?? '',
          role: 'tenant',
          roleChosen: true,
          createdAt: Date.now(),
        });
      }

      setInitialising(false);
    });

    return unsubscribe;
  }, []);

  async function signUp(fullName: string, email: string, password: string) {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(credential.user, { displayName: fullName.trim() });

    const fresh: UserProfile = {
      uid: credential.user.uid,
      fullName: fullName.trim(),
      email: email.trim(),
      role: 'tenant',
      roleChosen: false,
      createdAt: Date.now(),
    };

    const ref = doc(db, COLLECTIONS.users, credential.user.uid);
    await setDoc(ref, fresh);

    // setDoc resolves as soon as the write hits the local cache — a rules
    // rejection arrives later as a background warning, so signup would appear
    // to succeed against a locked database. Read back from the server to
    // confirm the write actually landed before we treat the account as usable.
    try {
      await getDocFromServer(ref);
    } catch {
      const error: any = new Error('Profile write was rejected by the server.');
      error.code = 'app/database-unreachable';
      throw error;
    }

    setProfile(fresh);
  }

  async function logIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email.trim(), password);
    // onAuthStateChanged loads the profile.
  }

  async function logOut() {
    await fbSignOut(auth);
    setProfile(null);
  }

  async function setRole(role: UserRole) {
    if (!profile) return;
    const updated: UserProfile = { ...profile, role, roleChosen: true };
    await setDoc(doc(db, COLLECTIONS.users, profile.uid), updated);
    setProfile(updated);
  }

  /**
   * Edits the user's own name or phone.
   *
   * The Firebase Auth displayName is updated alongside the Firestore document,
   * because AuthContext falls back to displayName when the profile document
   * cannot be read — leaving them out of step would make a rename appear to
   * revert the next time Firestore was unreachable.
   */
  async function updateDetails(changes: { fullName?: string; phone?: string }) {
    if (!profile) return;

    const updated: UserProfile = { ...profile, ...changes };

    // Firestore rejects undefined outright, and clearing the phone field is a
    // legitimate edit — so undefined keys are dropped rather than written.
    const payload = Object.fromEntries(
      Object.entries(updated).filter(([, value]) => value !== undefined),
    );

    await setDoc(doc(db, COLLECTIONS.users, profile.uid), payload);

    if (changes.fullName && auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: changes.fullName });
    }

    setProfile(updated);
  }

  return (
    <AuthContext.Provider
      value={{ profile, initialising, signUp, logIn, logOut, setRole, updateDetails }}
    >
      {children}
    </AuthContext.Provider>
  );
}
