import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
  EmailAuthProvider,
} from '@react-native-firebase/auth';
import { doc, getDoc, getDocFromServer, setDoc } from '@react-native-firebase/firestore';
import { auth, db, COLLECTIONS } from '../lib/firebase';
import { emailProblem, isValidEmailFormat, normaliseEmail } from '../lib/email';
import { registerForPush, unregisterPush } from '../services/push';
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
  updateDetails: (changes: {
    fullName?: string;
    phone?: string;
    photoUrl?: string;
  }) => Promise<void>;
  /**
   * Changes the account password.
   *
   * Takes the current one because Firebase requires a recent sign-in before it
   * will accept a password change, and rejects the attempt otherwise. Asking
   * for it also means a borrowed unlocked phone cannot silently take over the
   * account.
   */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /**
   * Whether the address on this account has been confirmed by opening the link.
   *
   * The only thing that proves an address is real and belongs to this person.
   * Format checks and the disposable-domain list run at signup and catch typos
   * and throwaway inboxes, but `asdfgh@gmail.com` passes both and belongs to
   * nobody — this is what settles it.
   */
  emailVerified: boolean;
  /** Sends the confirmation link again. */
  resendVerification: () => Promise<void>;
  /**
   * Re-reads the account from Firebase to pick up a link opened elsewhere.
   *
   * The link is opened in a browser, often on another device, and nothing tells
   * the app. Without this the user confirms their address and the app carries on
   * insisting they have not.
   */
  refreshVerification: () => Promise<boolean>;
  /**
   * Emails a link for setting a new password.
   *
   * The only way back into an account, and its absence was the difference
   * between a forgotten password and a lost account — with the listings,
   * conversations and saved properties inside it.
   */
  resetPassword: (email: string) => Promise<void>;
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
    case 'auth/requires-recent-login':
      return 'For security, log out and back in before changing your password.';
    case 'auth/missing-password':
      return 'Enter your current password.';
    case 'app/database-unreachable':
      return 'Account created, but the database rejected it. Check your Firestore security rules.';
    case 'app/email-rejected':
      // A backstop. SignUpScreen runs the same check first and shows the
      // specific reason, so reaching this means signUp was called from
      // somewhere that did not — worth being clear rather than generic.
      return 'That email address cannot be used. Use a permanent address you can open.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initialising, setInitialising] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);

  async function resetPassword(email: string) {
    const address = normaliseEmail(email);

    if (!isValidEmailFormat(address)) {
      const error: any = new Error('Enter the email address on your account.');
      error.code = 'app/email-rejected';
      throw error;
    }

    await sendPasswordResetEmail(auth, address);
  }

  async function resendVerification() {
    const user = auth.currentUser;
    if (!user) throw new Error('You are not signed in.');
    await sendEmailVerification(user);
  }

  async function refreshVerification(): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;

    // reload() pulls the account fresh from Firebase. `user.emailVerified` is
    // a cached value from sign-in time and never changes on its own, so
    // without this the app would insist the address is unconfirmed forever.
    //
    // The modular `reload(user)` rather than `user.reload()`: the method form
    // is the namespaced API, which RNFirebase deprecated in v22 and warns about
    // on every call. The whole file already uses the modular functions.
    await reload(user);
    const verified = auth.currentUser?.emailVerified ?? false;
    setEmailVerified(verified);
    return verified;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async user => {
      if (!user) {
        setProfile(null);
        setEmailVerified(false);
        setInitialising(false);
        return;
      }

      setEmailVerified(user.emailVerified);

      try {
        const ref = doc(db, COLLECTIONS.users, user.uid);
        const snapshot = await getDoc(ref);

        if (snapshot.exists()) {
          setProfile(snapshot.data() as UserProfile);

          // Registered here rather than at sign-in, so it also runs for a
          // session restored on launch — a token can change when the app is
          // reinstalled or moved to a new phone, and the old one goes dead
          // silently.
          //
          // Deliberately not awaited and never fatal. It shows a permission
          // dialog on Android 13+, and neither a refusal nor an emulator
          // should stand between somebody and their account.
          registerForPush(user.uid).catch(() => {});
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
    // Normalised before it reaches Firebase, so the same person cannot end up
    // with two accounts by capitalising differently on a different day.
    const address = normaliseEmail(email);

    const problem = emailProblem(address);
    if (problem) {
      const error: any = new Error(problem);
      error.code = 'app/email-rejected';
      throw error;
    }

    const credential = await createUserWithEmailAndPassword(auth, address, password);
    await updateProfile(credential.user, { displayName: fullName.trim() });

    const fresh: UserProfile = {
      uid: credential.user.uid,
      fullName: fullName.trim(),
      email: address,
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

    // Sent last, and allowed to fail quietly.
    //
    // The account exists and works by this point. If the mail cannot go out —
    // a network blip, a quota — failing the whole signup would throw away a
    // working account over a message that can be resent from Profile at any
    // time. The consequence of it not arriving is a prompt to resend, not a
    // locked-out user.
    sendEmailVerification(credential.user).catch(() => {});
  }

  async function logIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email.trim(), password);
    // onAuthStateChanged loads the profile.
  }

  async function logOut() {
    // Before signing out, while the rules still permit writing to this user's
    // own document. Afterwards the write would be rejected, and the token would
    // sit there sending this account's messages to whoever uses the phone next.
    const uid = auth.currentUser?.uid;
    if (uid) await unregisterPush(uid).catch(() => {});

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
  async function changePassword(currentPassword: string, newPassword: string) {
    const user = auth.currentUser;
    if (!user?.email) throw new Error('No signed-in account.');

    // Reauthenticate first. Firebase refuses a password change on a stale
    // session, and the failure it returns otherwise is opaque to the user.
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    await updatePassword(user, newPassword);
  }

  async function updateDetails(changes: {
    fullName?: string;
    phone?: string;
    photoUrl?: string;
  }) {
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
      value={{
        profile,
        initialising,
        signUp,
        logIn,
        logOut,
        setRole,
        updateDetails,
        changePassword,
        emailVerified,
        resendVerification,
        refreshVerification,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
