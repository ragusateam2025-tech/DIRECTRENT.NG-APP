# Tenant Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working tenant demo on a physical Android phone: sign up → choose role → browse six Lagos listings → open a property → see the ₦300,000 savings breakdown, with Saved and Profile working.

**Architecture:** Firebase email/password auth behind an `AuthContext`; a root navigator that switches between an auth stack and a bottom-tab app stack based on session state; listings read from Firestore into presentational components. All fee arithmetic and currency formatting live in two pure, unit-tested modules so the ₦300,000 figure can never disagree between screens.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript, `@react-native-firebase/{app,auth,firestore}` v24 (modular API), React Navigation v7, Jest for pure-logic tests.

**Spec:** `docs/superpowers/specs/2026-07-25-tenant-demo-slice-design.md`

---

## Testing Approach — Read This First

This plan does **not** apply full TDD to UI screens, and that is a deliberate decision, not an oversight.

- **Unit-tested with Jest (Tasks 1–2):** `src/lib/format.ts` and `src/lib/savings.ts`. These are pure functions, they carry the most brand-critical values in the product (₦300,000, the 32%/2%/30% split, the exact fee label), and a silent regression here is the single worst thing that could happen in front of the client. Cheap to test, high value.
- **Verified on the physical device (Tasks 3–14):** every screen. `CLAUDE.md` §4 establishes on-device confirmation as the acceptance gate for this project, and the spec's §7 gates are written that way. The founder is non-technical and verifies by looking at the phone.

Setting up a full React Native component-testing harness would consume several hours of a ~44-hour budget and would not increase confidence in the demo beyond what device verification already gives. If this slice becomes the real product, add `@testing-library/react-native` then.

**Device verification is mandatory, not optional.** A task is not complete until its "Verify on device" step passes.

---

## Prerequisites

- [ ] Gate 0 passed: `npx expo run:android` succeeded and the app launches without a red error screen.
- [ ] Phone connected: `adb devices` lists a device.
- [ ] Metro running: `npx expo start --dev-client`.

**Windows note — this caused three build failures already:** Metro's file watcher and Gradle fight over `android/build`. **Stop Metro before any native rebuild.** Pure JS/TS changes (every task in this plan) need only Fast Refresh — no rebuild.

---

## File Structure

**Create:**

| Path | Responsibility |
|------|----------------|
| `src/lib/format.ts` | Naira formatting. Nothing else. |
| `src/lib/savings.ts` | Fee arithmetic. Nothing else. |
| `src/types/index.ts` | `Listing`, `UserProfile`, `UserRole` types |
| `src/context/AuthContext.tsx` | Session state, sign up / log in / log out |
| `src/services/listings.ts` | Firestore reads for listings |
| `src/services/saved.ts` | Saved-property reads/writes |
| `src/navigation/RootNavigator.tsx` | Auth stack vs app stack switch |
| `src/navigation/AppTabs.tsx` | Bottom tabs + Browse stack |
| `src/components/Button.tsx` | Primary/secondary button |
| `src/components/TextField.tsx` | Labelled text input with error slot |
| `src/components/EmptyState.tsx` | Icon + title + body, reused by Saved and Messages |
| `src/components/PropertyCard.tsx` | Listing card for Browse and Saved |
| `src/components/SavingsBreakdown.tsx` | The centrepiece fee table |
| `src/screens/auth/WelcomeScreen.tsx` | The Agent Effect + value prop |
| `src/screens/auth/SignUpScreen.tsx` | Name, email, password |
| `src/screens/auth/LogInScreen.tsx` | Email, password |
| `src/screens/auth/RoleSelectionScreen.tsx` | Tenant / Landlord / Both |
| `src/screens/BrowseScreen.tsx` | List of six properties |
| `src/screens/ListingDetailScreen.tsx` | Photos, rent, savings |
| `src/screens/SavedScreen.tsx` | Saved properties |
| `src/screens/MessagesScreen.tsx` | Deliberate empty state |
| `src/screens/ProfileScreen.tsx` | Details, role switcher, log out |
| `src/data/seedListings.ts` | The six properties as typed data |
| `scripts/seed.ts` | Idempotent Firestore seeder |
| `__tests__/format.test.ts` | Formatting tests |
| `__tests__/savings.test.ts` | Fee arithmetic tests |

**Modify:**

| Path | Change |
|------|--------|
| `src/lib/firebase.ts` | Convert to modular v24 API; drop health-check helpers |
| `App.tsx` | Mount `AuthProvider` + `RootNavigator` |
| `package.json` | Add Jest dev dependencies and `test` script |

**Delete:** `src/screens/FirebaseHealthCheck.tsx` — in Task 5, once navigation replaces it.

---

## Task 1: Currency Formatting (TDD)

**Files:**
- Create: `src/lib/format.ts`
- Create: `__tests__/format.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Jest**

```bash
npx expo install -- --save-dev jest-expo jest @types/jest
```

- [ ] **Step 2: Add Jest config and test script to `package.json`**

Add these two top-level keys (keep everything already there):

```json
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "test": "jest"
  },
  "jest": {
    "preset": "jest-expo",
    "testPathIgnorePatterns": ["/node_modules/", "/android/", "/ios/"]
  }
```

- [ ] **Step 3: Write the failing test**

Create `__tests__/format.test.ts`:

```typescript
import { formatNaira } from '../src/lib/format';

describe('formatNaira', () => {
  it('formats a million with the literal naira sign and commas', () => {
    expect(formatNaira(1000000)).toBe('₦1,000,000');
  });

  it('formats the headline savings figure', () => {
    expect(formatNaira(300000)).toBe('₦300,000');
  });

  it('formats small amounts without commas', () => {
    expect(formatNaira(500)).toBe('₦500');
  });

  it('formats zero', () => {
    expect(formatNaira(0)).toBe('₦0');
  });

  it('rounds fractional kobo to whole naira', () => {
    expect(formatNaira(1234.56)).toBe('₦1,235');
  });

  it('uses the literal naira character, never an escape sequence', () => {
    expect(formatNaira(1000)).toContain('₦');
    expect(formatNaira(1000)).not.toContain('\\u20A6');
    expect(formatNaira(1000)).not.toContain('&#x20A6;');
  });
});
```

- [ ] **Step 4: Run the test and confirm it fails**

```bash
npm test -- format
```

Expected: FAIL — `Cannot find module '../src/lib/format'`.

- [ ] **Step 5: Write the implementation**

Create `src/lib/format.ts`:

```typescript
// Currency formatting. The ₦ below is the literal Unicode naira sign (U+20A6).
// Never replace it with an escape sequence — see CLAUDE.md §3.

/**
 * Formats a naira amount for display: rounded to whole naira, comma-separated,
 * prefixed with the literal ₦ sign.
 */
export function formatNaira(amount: number): string {
  const whole = Math.round(amount);
  return `₦${whole.toLocaleString('en-NG')}`;
}
```

- [ ] **Step 6: Run the test and confirm it passes**

```bash
npm test -- format
```

Expected: PASS, 6 tests.

If `toLocaleString('en-NG')` returns unseparated digits in the Jest environment, replace the body with an explicit regex so behaviour does not depend on the JS engine's locale data:

```typescript
export function formatNaira(amount: number): string {
  const whole = Math.round(amount);
  const separated = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `₦${separated}`;
}
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/format.ts __tests__/format.test.ts
git commit -m "feat: add naira formatting with tests"
```

---

## Task 2: Savings Calculator (TDD)

**Files:**
- Create: `src/lib/savings.ts`
- Create: `__tests__/savings.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/savings.test.ts`:

```typescript
import {
  calculateSavings,
  TRADITIONAL_FEE_RATE,
  DIRECTRENT_FEE_RATE,
  TRADITIONAL_FEE_LABEL,
  DIRECTRENT_FEE_LABEL,
  SAVINGS_LABEL,
} from '../src/lib/savings';

describe('calculateSavings', () => {
  it('produces the headline figures at ₦1,000,000 annual rent', () => {
    const result = calculateSavings(1000000);
    expect(result.annualRent).toBe(1000000);
    expect(result.traditionalFees).toBe(320000);
    expect(result.directrentFee).toBe(20000);
    expect(result.savings).toBe(300000);
  });

  it('scales linearly with rent', () => {
    const result = calculateSavings(2000000);
    expect(result.traditionalFees).toBe(640000);
    expect(result.directrentFee).toBe(40000);
    expect(result.savings).toBe(600000);
  });

  it('handles rent below a million', () => {
    const result = calculateSavings(450000);
    expect(result.traditionalFees).toBe(144000);
    expect(result.directrentFee).toBe(9000);
    expect(result.savings).toBe(135000);
  });

  it('always makes savings equal traditional fees minus our fee', () => {
    for (const rent of [350000, 800000, 1000000, 1750000, 5000000]) {
      const r = calculateSavings(rent);
      expect(r.savings).toBe(r.traditionalFees - r.directrentFee);
    }
  });

  it('returns whole naira, never fractions', () => {
    const result = calculateSavings(333333);
    expect(Number.isInteger(result.traditionalFees)).toBe(true);
    expect(Number.isInteger(result.directrentFee)).toBe(true);
    expect(Number.isInteger(result.savings)).toBe(true);
  });

  it('treats zero rent as zero everything', () => {
    const result = calculateSavings(0);
    expect(result.traditionalFees).toBe(0);
    expect(result.savings).toBe(0);
  });
});

describe('fee constants', () => {
  it('uses the rates from the handoff document', () => {
    expect(TRADITIONAL_FEE_RATE).toBe(0.32);
    expect(DIRECTRENT_FEE_RATE).toBe(0.02);
  });

  it('labels traditional fees as a composite, never as an agent fee', () => {
    expect(TRADITIONAL_FEE_LABEL).toBe('Traditional Fees (Agent + Legal + Misc)');
    expect(TRADITIONAL_FEE_LABEL).not.toContain('Agent Fee');
  });

  it('labels our fee and the savings row correctly', () => {
    expect(DIRECTRENT_FEE_LABEL).toBe('Directrent.ng Fee (2%)');
    expect(SAVINGS_LABEL).toBe('Your Savings');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

```bash
npm test -- savings
```

Expected: FAIL — `Cannot find module '../src/lib/savings'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/savings.ts`:

```typescript
// Fee model — source of truth: DIRECTRENT_MOBILE_HANDOFF.md §5.1.
// These numbers appear in front of clients. Do not change them without
// changing the handoff document first.

/** Traditional all-in fees: agency (~10%) + legal (~10%) + caution (~7%) + misc (~5%). */
export const TRADITIONAL_FEE_RATE = 0.32;

/** What Directrent.ng charges. */
export const DIRECTRENT_FEE_RATE = 0.02;

/**
 * Never label this "Agent Fee (32%)" — the 32% is a composite of several
 * separate charges, and calling it an agent fee is inaccurate. CLAUDE.md §3.
 */
export const TRADITIONAL_FEE_LABEL = 'Traditional Fees (Agent + Legal + Misc)';
export const DIRECTRENT_FEE_LABEL = 'Directrent.ng Fee (2%)';
export const SAVINGS_LABEL = 'Your Savings';

export interface SavingsBreakdown {
  annualRent: number;
  traditionalFees: number;
  directrentFee: number;
  savings: number;
}

/**
 * Calculates what a tenant saves by renting directly instead of through the
 * traditional middleman chain. At ₦1,000,000 annual rent this yields ₦300,000.
 */
export function calculateSavings(annualRent: number): SavingsBreakdown {
  const traditionalFees = Math.round(annualRent * TRADITIONAL_FEE_RATE);
  const directrentFee = Math.round(annualRent * DIRECTRENT_FEE_RATE);

  return {
    annualRent,
    traditionalFees,
    directrentFee,
    savings: traditionalFees - directrentFee,
  };
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
npm test -- savings
```

Expected: PASS, 9 tests.

- [ ] **Step 5: Run the whole suite**

```bash
npm test
```

Expected: PASS, 15 tests across 2 suites.

- [ ] **Step 6: Commit**

```bash
git add src/lib/savings.ts __tests__/savings.test.ts
git commit -m "feat: add savings calculator with tests"
```

---

## Task 3: Domain Types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Write the types**

Create `src/types/index.ts`:

```typescript
// Listing shape is a trimmed subset of CreateListingRequest in
// MASTER_PRD_PART2.md §2.1.3 — same field names and nesting, fewer fields,
// so the full landlord listing flow can extend this without renaming anything.

export type UserRole = 'tenant' | 'landlord' | 'both';

export type PropertyType =
  | 'self_contained'
  | 'mini_flat'
  | 'one_bedroom'
  | 'two_bedroom'
  | 'three_bedroom';

export type FurnishingType = 'unfurnished' | 'semi_furnished' | 'furnished';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdAt: number;
}

export interface Listing {
  id: string;
  basicInfo: {
    title: string;
    propertyType: PropertyType;
    bedrooms: number;
    bathrooms: number;
    furnishing: FurnishingType;
  };
  location: {
    address: string;
    area: string;
    lga: string;
  };
  media: {
    /** Key into the bundled image map in src/data/seedListings.ts. */
    photoKey: string;
  };
  pricing: {
    annualRent: number;
    cautionDepositMonths: number;
    serviceCharge: number;
  };
  details: {
    description: string;
    amenities: string[];
    maxOccupants: number;
  };
  status: {
    listing: 'active' | 'rented' | 'draft';
  };
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add domain types for listings and users"
```

---

## Task 4: Firebase Modular Refactor

**Files:**
- Modify: `src/lib/firebase.ts`

The current file uses the v24 **namespaced** API (`firestore().collection(...)`), which logs deprecation warnings. All new code uses the modular API. Verified available in v24.0.0.

- [ ] **Step 1: Replace the file**

Replace all of `src/lib/firebase.ts`:

```typescript
import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';

/** The default Firebase app, configured from google-services.json. */
export const app = getApp();

/** Auth instance — use with modular functions from @react-native-firebase/auth. */
export const auth = getAuth(app);

/** Firestore instance — use with modular functions from @react-native-firebase/firestore. */
export const db = getFirestore(app);

/** Firestore collection names, in one place so they cannot drift. */
export const COLLECTIONS = {
  users: 'users',
  listings: 'listings',
  saved: 'saved',
} as const;
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: one error in `src/screens/FirebaseHealthCheck.tsx` (it imports the removed `testFirestoreConnection`). That file is deleted in Task 5 — this error is expected and resolves then.

- [ ] **Step 3: Commit**

```bash
git add src/lib/firebase.ts
git commit -m "refactor: use firebase modular API"
```

---

## Task 5: Auth Context

**Files:**
- Create: `src/context/AuthContext.tsx`

- [ ] **Step 1: Write the context**

Create `src/context/AuthContext.tsx`:

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
} from '@react-native-firebase/auth';
import { doc, getDoc, setDoc } from '@react-native-firebase/firestore';
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
          createdAt: Date.now(),
        };
        await setDoc(ref, fresh);
        setProfile(fresh);
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
      createdAt: Date.now(),
    };

    await setDoc(doc(db, COLLECTIONS.users, credential.user.uid), fresh);
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
    const updated = { ...profile, role };
    await setDoc(doc(db, COLLECTIONS.users, profile.uid), updated);
    setProfile(updated);
  }

  return (
    <AuthContext.Provider value={{ profile, initialising, signUp, logIn, logOut, setRole }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: only the known `FirebaseHealthCheck.tsx` error.

- [ ] **Step 3: Commit**

```bash
git add src/context/AuthContext.tsx
git commit -m "feat: add auth context with session persistence"
```

---

## Task 6: Shared UI Components

**Files:**
- Create: `src/components/Button.tsx`
- Create: `src/components/TextField.tsx`
- Create: `src/components/EmptyState.tsx`

- [ ] **Step 1: Create `src/components/Button.tsx`**

```typescript
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, typography, spacing, radius } from '../theme/tokens';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
}

export default function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' ? styles.primary : styles.secondary,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.textPrimary} />
      ) : (
        <Text style={[styles.label, variant === 'secondary' && styles.labelSecondary]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.accentCoral },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: {
    color: colors.textPrimary,
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.base,
  },
  labelSecondary: { color: colors.accentGold },
});
```

- [ ] **Step 2: Create `src/components/TextField.tsx`**

```typescript
import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, typography, spacing, radius } from '../theme/tokens';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'words';
  keyboardType?: 'default' | 'email-address';
  error?: string;
}

export default function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  autoCapitalize = 'none',
  keyboardType = 'default',
  error,
}: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        style={[styles.input, !!error && styles.inputError]}
        accessibilityLabel={label}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: {
    color: colors.textSecondary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.xs,
  },
  input: {
    height: 52,
    backgroundColor: colors.backgroundPaper,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
  },
  inputError: { borderColor: colors.error },
  error: {
    color: colors.errorLight,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
});
```

- [ ] **Step 3: Create `src/components/EmptyState.tsx`**

```typescript
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing } from '../theme/tokens';

interface EmptyStateProps {
  icon: string;
  title: string;
  body: string;
}

export default function EmptyState({ icon, title, body }: EmptyStateProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  icon: { fontSize: 48, marginBottom: spacing.md },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.xl,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  body: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    textAlign: 'center',
    lineHeight: 22,
  },
});
```

- [ ] **Step 4: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/components
git commit -m "feat: add shared Button, TextField and EmptyState components"
```

---

## Task 7: Navigation Skeleton — Device Gate 1

**Files:**
- Create: `src/navigation/RootNavigator.tsx`
- Create: `src/navigation/AppTabs.tsx`
- Create: placeholder screens (replaced in later tasks)
- Modify: `App.tsx`
- Delete: `src/screens/FirebaseHealthCheck.tsx`

- [ ] **Step 1: Create the five placeholder screens**

Create each of these so navigation compiles. Each is replaced by a real implementation later.

`src/screens/BrowseScreen.tsx`, `src/screens/SavedScreen.tsx`, `src/screens/MessagesScreen.tsx`, `src/screens/ProfileScreen.tsx` — each with the same shape, changing only the name:

```typescript
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../theme/tokens';

export default function BrowseScreen() {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.text}>Browse</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.textPrimary,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.xl,
  },
});
```

- [ ] **Step 2: Create `src/navigation/AppTabs.tsx`**

```typescript
import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors, typography } from '../theme/tokens';
import BrowseScreen from '../screens/BrowseScreen';
import SavedScreen from '../screens/SavedScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ListingDetailScreen from '../screens/ListingDetailScreen';

export type BrowseStackParams = {
  BrowseList: undefined;
  ListingDetail: { listingId: string };
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<BrowseStackParams>();

function BrowseStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontFamily: typography.families.heading },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="BrowseList" component={BrowseScreen} options={{ title: 'Browse' }} />
      <Stack.Screen
        name="ListingDetail"
        component={ListingDetailScreen}
        options={{ title: 'Property' }}
      />
    </Stack.Navigator>
  );
}

/** Emoji tab icons keep the demo dependency-free — no icon font to configure. */
function tabIcon(emoji: string) {
  return ({ color }: { color: string }) => (
    <Text style={{ fontSize: 20, color, opacity: color === colors.accentGold ? 1 : 0.6 }}>
      {emoji}
    </Text>
  );
}

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.backgroundPaper,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accentGold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: typography.families.bodyMedium,
          fontSize: typography.sizes.xs,
        },
      }}
    >
      <Tab.Screen
        name="Browse"
        component={BrowseStack}
        options={{ tabBarIcon: tabIcon('🏠') }}
      />
      <Tab.Screen name="Saved" component={SavedScreen} options={{ tabBarIcon: tabIcon('♥') }} />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ tabBarIcon: tabIcon('💬') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: tabIcon('👤') }}
      />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 3: Create `src/navigation/RootNavigator.tsx`**

```typescript
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import LogInScreen from '../screens/auth/LogInScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import AppTabs from './AppTabs';

export type AuthStackParams = {
  Welcome: undefined;
  SignUp: undefined;
  LogIn: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParams>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.backgroundPaper,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.accentGold,
  },
};

export default function RootNavigator() {
  const { profile, initialising } = useAuth();

  if (initialising) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.accentGold} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {profile ? (
        <AppTabs />
      ) : (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="LogIn" component={LogInScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

**Note:** `RoleSelectionScreen` is imported but not yet routed — it is wired in Task 9. Remove the unused import if the linter objects, and restore it in Task 9.

- [ ] **Step 4: Replace `App.tsx`**

```typescript
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ThemeProvider from './src/theme/ThemeProvider';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
        <StatusBar style="light" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 5: Delete the health-check screen**

```bash
git rm src/screens/FirebaseHealthCheck.tsx
```

- [ ] **Step 6: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors. (Tasks 8 and 11 create `WelcomeScreen`, `SignUpScreen`, `LogInScreen`, `RoleSelectionScreen` and `ListingDetailScreen`. If running strictly in order, create each as a one-line placeholder now using the same shape as Step 1, then replace them.)

- [ ] **Step 7: VERIFY ON DEVICE — Gate 1a**

Reload the app. Expected: the Welcome placeholder renders on a dark burgundy background with no red error screen.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add navigation skeleton with auth and tab stacks"
```

---

## Task 8: Welcome, Sign Up and Log In Screens

**Files:**
- Create: `src/screens/auth/WelcomeScreen.tsx`
- Create: `src/screens/auth/SignUpScreen.tsx`
- Create: `src/screens/auth/LogInScreen.tsx`

- [ ] **Step 1: Create `src/screens/auth/WelcomeScreen.tsx`**

```typescript
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing, radius } from '../../theme/tokens';
import Button from '../../components/Button';
import { formatNaira } from '../../lib/format';
import type { AuthStackParams } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<AuthStackParams, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.wrapper}>
      <View style={styles.hero}>
        <Text style={styles.wordmark}>
          <Text style={styles.direct}>Direct</Text>
          <Text style={styles.rent}>rent</Text>
        </Text>

        <Text style={styles.headline}>Rent directly.{'\n'}Keep your money.</Text>

        <View style={styles.savingsPill}>
          <Text style={styles.savingsPillText}>
            Save up to {formatNaira(300000)} in rental fees
          </Text>
        </View>

        <Text style={styles.body}>
          The Agent Effect costs Lagos renters hundreds of thousands of naira in
          fees that buy them nothing. We connect you straight to verified
          landlords — no middleman, no inflated charges.
        </Text>

        <Text style={styles.research}>
          Based on primary research with 70 Lagos residents
        </Text>
      </View>

      <View style={styles.actions}>
        <Button label="Create an account" onPress={() => navigation.navigate('SignUp')} />
        <View style={styles.spacer} />
        <Button
          label="I already have an account"
          variant="secondary"
          onPress={() => navigation.navigate('LogIn')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  hero: { flex: 1, justifyContent: 'center' },
  wordmark: { fontSize: typography.sizes['4xl'], fontFamily: typography.families.display },
  direct: { color: colors.textPrimary },
  rent: { color: colors.accentGold },
  headline: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['3xl'],
    marginTop: spacing.lg,
    lineHeight: 38,
  },
  savingsPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentCoral,
    borderRadius: radius.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  savingsPillText: {
    color: colors.textPrimary,
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.sm,
  },
  body: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    lineHeight: 24,
    marginTop: spacing.lg,
  },
  research: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    marginTop: spacing.md,
  },
  actions: { paddingBottom: spacing.md },
  spacer: { height: spacing.sm },
});
```

- [ ] **Step 2: Create `src/screens/auth/SignUpScreen.tsx`**

```typescript
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing } from '../../theme/tokens';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import { useAuth, friendlyAuthError } from '../../context/AuthContext';
import type { AuthStackParams } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<AuthStackParams, 'SignUp'>;

export default function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setError('');

    if (fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await signUp(fullName, email, password);
      // RootNavigator swaps to the app stack automatically.
    } catch (err: any) {
      setError(friendlyAuthError(err?.code ?? ''));
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.wrapper}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Start renting directly in Lagos.</Text>

          <TextField
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Adebayo Okonkwo"
            autoCapitalize="words"
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            secureTextEntry
            error={error}
          />

          <Button label="Create account" onPress={handleSignUp} loading={loading} />

          <Text style={styles.switch} onPress={() => navigation.navigate('LogIn')}>
            Already have an account? Log in
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: spacing.xl },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['2xl'],
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  switch: {
    color: colors.accentGold,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
```

- [ ] **Step 3: Create `src/screens/auth/LogInScreen.tsx`**

Identical structure to Sign Up, without the name field:

```typescript
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing } from '../../theme/tokens';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import { useAuth, friendlyAuthError } from '../../context/AuthContext';
import type { AuthStackParams } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<AuthStackParams, 'LogIn'>;

export default function LogInScreen({ navigation }: Props) {
  const { logIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogIn() {
    setError('');

    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length === 0) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      await logIn(email, password);
    } catch (err: any) {
      setError(friendlyAuthError(err?.code ?? ''));
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.wrapper}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Log in to continue.</Text>

          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
            error={error}
          />

          <Button label="Log in" onPress={handleLogIn} loading={loading} />

          <Text style={styles.switch} onPress={() => navigation.navigate('SignUp')}>
            New here? Create an account
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: spacing.xl },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['2xl'],
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  switch: {
    color: colors.accentGold,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
```

- [ ] **Step 4: VERIFY ON DEVICE — Gate 1b**

1. Welcome screen shows the wordmark, headline, and a coral pill reading "Save up to ₦300,000 in rental fees".
2. Tap "Create an account", fill in a real name/email/password, submit.
3. The app switches to the tab bar (Browse placeholder).
4. **Force-quit the app and reopen it.** It must return to the tabs, still signed in — this proves session persistence.
5. Check the Firebase console: an Authentication user and a `users/{uid}` document both exist.

**If Firestore writes fail with `permission-denied`:** the project's test-mode rules have expired. In the Firebase console → Firestore → Rules, publish:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /listings/{listingId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/saved/{listingId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

These rules are demo-appropriate: signed-in users read listings but cannot write them, and can only touch their own profile and saved list. They are **not** sufficient for production — see MASTER_PRD_PART2.md §4.2.

- [ ] **Step 5: Commit**

```bash
git add src/screens/auth
git commit -m "feat: add welcome, signup and login screens"
```

---

## Task 9: Role Selection

**Files:**
- Create: `src/screens/auth/RoleSelectionScreen.tsx`
- Modify: `src/navigation/RootNavigator.tsx`

New accounts default to `role: 'tenant'`. This screen makes the choice explicit and visible, which is what the client needs to see.

- [ ] **Step 1: Create `src/screens/auth/RoleSelectionScreen.tsx`**

```typescript
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../../theme/tokens';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

const OPTIONS: Array<{ role: UserRole; title: string; body: string }> = [
  { role: 'tenant', title: "I'm looking for a place", body: 'Browse verified listings and rent directly from landlords.' },
  { role: 'landlord', title: 'I have property to rent', body: 'List your property and reach tenants without an agent.' },
  { role: 'both', title: 'Both', body: 'Switch between renting and listing any time.' },
];

export default function RoleSelectionScreen() {
  const { setRole } = useAuth();
  const [selected, setSelected] = useState<UserRole>('tenant');
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    setSaving(true);
    try {
      await setRole(selected);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.wrapper}>
      <Text style={styles.title}>How will you use Directrent?</Text>
      <Text style={styles.subtitle}>You can change this later in your profile.</Text>

      <View style={styles.options}>
        {OPTIONS.map(option => {
          const isSelected = option.role === selected;
          return (
            <Pressable
              key={option.role}
              onPress={() => setSelected(option.role)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              style={[styles.option, isSelected && styles.optionSelected]}
            >
              <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                {option.title}
              </Text>
              <Text style={styles.optionBody}>{option.body}</Text>
            </Pressable>
          );
        })}
      </View>

      <Button label="Continue" onPress={handleContinue} loading={saving} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['2xl'],
    marginTop: spacing.lg,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    marginTop: spacing.xs,
  },
  options: { flex: 1, marginTop: spacing.lg },
  option: {
    backgroundColor: colors.backgroundPaper,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionSelected: { borderColor: colors.accentGold, backgroundColor: colors.backgroundElevated },
  optionTitle: {
    color: colors.textPrimary,
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.base,
  },
  optionTitleSelected: { color: colors.accentGold },
  optionBody: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
});
```

- [ ] **Step 2: Route it in `RootNavigator.tsx`**

The role screen shows once, after signup, before the tabs. Add a `roleChosen` flag by treating `createdAt` as the signal is fragile — instead, add an explicit field.

In `src/types/index.ts`, add to `UserProfile`:

```typescript
  /** False until the user passes the role-selection screen. */
  roleChosen: boolean;
```

In `src/context/AuthContext.tsx`, set `roleChosen: false` in both places a `UserProfile` is constructed (the `signUp` function and the `onAuthStateChanged` fallback), and in `setRole` change the update to:

```typescript
    const updated = { ...profile, role, roleChosen: true };
```

In `src/navigation/RootNavigator.tsx`, replace the render branch:

```typescript
  return (
    <NavigationContainer theme={navTheme}>
      {!profile ? (
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="LogIn" component={LogInScreen} />
        </Stack.Navigator>
      ) : !profile.roleChosen ? (
        <RoleSelectionScreen />
      ) : (
        <AppTabs />
      )}
    </NavigationContainer>
  );
```

- [ ] **Step 3: VERIFY ON DEVICE — Gate 1c**

Sign up with a **new** email. Expected: role selection appears, choosing an option and tapping Continue lands on the tabs. Force-quit and reopen — it goes straight to the tabs, not back to role selection.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add role selection after signup"
```

---

## Task 10: Seed Data and Seeder

**Files:**
- Create: `src/data/seedListings.ts`
- Create: `scripts/seed.ts`

- [ ] **Step 1: Add the property images**

Place six landscape images in `assets/properties/` named `property-1.jpg` … `property-6.jpg`.

**If the founder's photos have not arrived**, create the folder and skip to Step 2 — `PropertyCard` falls back to a branded gradient block when the image is missing.

- [ ] **Step 2: Create `src/data/seedListings.ts`**

```typescript
import type { Listing } from '../types';

/**
 * Bundled property images, keyed by Listing.media.photoKey.
 * require() paths must be static — React Native resolves them at build time.
 * If an image file is missing, the value is undefined and PropertyCard falls
 * back to a branded placeholder.
 */
export const PROPERTY_IMAGES: Record<string, number | undefined> = {
  'property-1': undefined,
  'property-2': undefined,
  'property-3': undefined,
  'property-4': undefined,
  'property-5': undefined,
  'property-6': undefined,
};

// Once the real photos are in assets/properties/, replace the map above with:
//
// export const PROPERTY_IMAGES: Record<string, number | undefined> = {
//   'property-1': require('../../assets/properties/property-1.jpg'),
//   'property-2': require('../../assets/properties/property-2.jpg'),
//   'property-3': require('../../assets/properties/property-3.jpg'),
//   'property-4': require('../../assets/properties/property-4.jpg'),
//   'property-5': require('../../assets/properties/property-5.jpg'),
//   'property-6': require('../../assets/properties/property-6.jpg'),
// };

export const SEED_LISTINGS: Listing[] = [
  {
    id: 'yaba-selfcon-01',
    basicInfo: {
      title: 'Bright self-contained near Yaba College',
      propertyType: 'self_contained',
      bedrooms: 1,
      bathrooms: 1,
      furnishing: 'unfurnished',
    },
    location: { address: '12 Alagomeji Street, Yaba', area: 'Yaba', lga: 'Lagos Mainland' },
    media: { photoKey: 'property-1' },
    pricing: { annualRent: 450000, cautionDepositMonths: 6, serviceCharge: 25000 },
    details: {
      description:
        'A clean, well-lit self-contained apartment a short walk from Yaba College of Technology. Tiled throughout, with a private bathroom and kitchenette. Prepaid meter installed, and the compound has a borehole so water is steady.',
      amenities: ['Prepaid meter', 'Borehole water', 'Tiled floors', 'Security gate'],
      maxOccupants: 2,
    },
    status: { listing: 'active' },
  },
  {
    id: 'yaba-minif-02',
    basicInfo: {
      title: 'Mini flat with balcony, Sabo Yaba',
      propertyType: 'mini_flat',
      bedrooms: 1,
      bathrooms: 1,
      furnishing: 'semi_furnished',
    },
    location: { address: '5 Akinwunmi Street, Sabo, Yaba', area: 'Yaba', lga: 'Lagos Mainland' },
    media: { photoKey: 'property-2' },
    pricing: { annualRent: 750000, cautionDepositMonths: 12, serviceCharge: 40000 },
    details: {
      description:
        'Mini flat on the first floor with a private balcony overlooking a quiet street. Comes with fitted wardrobes and kitchen cabinets. Ten minutes from the Yaba bus stop and walking distance to the market.',
      amenities: ['Balcony', 'Fitted wardrobes', 'Prepaid meter', 'Parking space'],
      maxOccupants: 3,
    },
    status: { listing: 'active' },
  },
  {
    id: 'surulere-1bed-03',
    basicInfo: {
      title: 'One bedroom apartment off Adeniran Ogunsanya',
      propertyType: 'one_bedroom',
      bedrooms: 1,
      bathrooms: 1,
      furnishing: 'unfurnished',
    },
    location: {
      address: '28 Ogunlana Drive, Surulere',
      area: 'Surulere',
      lga: 'Surulere',
    },
    media: { photoKey: 'property-3' },
    pricing: { annualRent: 900000, cautionDepositMonths: 12, serviceCharge: 50000 },
    details: {
      description:
        'Spacious one bedroom in a well-maintained block just off Adeniran Ogunsanya. Separate living area, en-suite bathroom, and a dedicated kitchen. The estate has a generator for common areas and 24-hour security.',
      amenities: ['24-hour security', 'Backup generator', 'En-suite bathroom', 'Water treatment'],
      maxOccupants: 3,
    },
    status: { listing: 'active' },
  },
  {
    id: 'surulere-2bed-04',
    basicInfo: {
      title: 'Two bedroom flat, quiet Surulere street',
      propertyType: 'two_bedroom',
      bedrooms: 2,
      bathrooms: 2,
      furnishing: 'unfurnished',
    },
    location: { address: '14 Shitta Street, Surulere', area: 'Surulere', lga: 'Surulere' },
    media: { photoKey: 'property-4' },
    pricing: { annualRent: 1000000, cautionDepositMonths: 12, serviceCharge: 60000 },
    details: {
      description:
        'Two bedroom flat with both rooms en-suite, on a quiet residential street. Recently repainted with new plumbing throughout. Close to National Stadium and easy access to Ojuelegba.',
      amenities: ['Both rooms en-suite', 'Prepaid meter', 'Parking', 'Security gate'],
      maxOccupants: 4,
    },
    status: { listing: 'active' },
  },
  {
    id: 'yaba-2bed-05',
    basicInfo: {
      title: 'Two bedroom, newly built, Herbert Macaulay',
      propertyType: 'two_bedroom',
      bedrooms: 2,
      bathrooms: 2,
      furnishing: 'semi_furnished',
    },
    location: {
      address: '90 Herbert Macaulay Way, Yaba',
      area: 'Yaba',
      lga: 'Lagos Mainland',
    },
    media: { photoKey: 'property-5' },
    pricing: { annualRent: 1400000, cautionDepositMonths: 12, serviceCharge: 80000 },
    details: {
      description:
        'Newly built two bedroom on Herbert Macaulay Way, finished to a high standard with POP ceilings and fitted kitchen. Serviced compound with a shared generator and dedicated parking. Ideal for a young family or professionals sharing.',
      amenities: ['Serviced compound', 'POP ceilings', 'Fitted kitchen', 'Dedicated parking'],
      maxOccupants: 4,
    },
    status: { listing: 'active' },
  },
  {
    id: 'surulere-3bed-06',
    basicInfo: {
      title: 'Three bedroom family flat, Bode Thomas',
      propertyType: 'three_bedroom',
      bedrooms: 3,
      bathrooms: 3,
      furnishing: 'unfurnished',
    },
    location: { address: '7 Bode Thomas Street, Surulere', area: 'Surulere', lga: 'Surulere' },
    media: { photoKey: 'property-6' },
    pricing: { annualRent: 1800000, cautionDepositMonths: 12, serviceCharge: 100000 },
    details: {
      description:
        'Generous three bedroom flat on Bode Thomas, suited to a family. All rooms en-suite, large living and dining area, and a separate laundry space. Secure compound with parking for two cars.',
      amenities: ['All rooms en-suite', 'Laundry space', 'Parking for two', '24-hour security'],
      maxOccupants: 6,
    },
    status: { listing: 'active' },
  },
];
```

- [ ] **Step 3: Create `scripts/seed.ts`**

This runs **inside the app** (it needs the native Firebase SDK), triggered from the Profile screen in Task 13 — it is not a standalone Node script.

```typescript
import { doc, setDoc, writeBatch } from '@react-native-firebase/firestore';
import { db, COLLECTIONS } from '../src/lib/firebase';
import { SEED_LISTINGS } from '../src/data/seedListings';

/**
 * Writes the six demo listings to Firestore.
 * Idempotent: each listing uses a fixed document ID, so running this twice
 * overwrites rather than duplicating.
 */
export async function seedListings(): Promise<number> {
  const batch = writeBatch(db);

  for (const listing of SEED_LISTINGS) {
    const { id, ...data } = listing;
    batch.set(doc(db, COLLECTIONS.listings, id), data);
  }

  await batch.commit();
  return SEED_LISTINGS.length;
}
```

- [ ] **Step 4: Typecheck and commit**

```bash
npx tsc --noEmit
git add src/data scripts
git commit -m "feat: add six seed listings and idempotent seeder"
```

---

## Task 11: Listings Service, Browse Screen and Property Card

**Files:**
- Create: `src/services/listings.ts`
- Create: `src/components/PropertyCard.tsx`
- Modify: `src/screens/BrowseScreen.tsx`

- [ ] **Step 1: Create `src/services/listings.ts`**

```typescript
import { collection, doc, getDoc, getDocs, query, where } from '@react-native-firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import type { Listing } from '../types';

/** Fetches all active listings. */
export async function fetchListings(): Promise<Listing[]> {
  const q = query(
    collection(db, COLLECTIONS.listings),
    where('status.listing', '==', 'active'),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Listing);
}

/** Fetches a single listing by ID, or null if it does not exist. */
export async function fetchListing(id: string): Promise<Listing | null> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.listings, id));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Listing;
}
```

- [ ] **Step 2: Create `src/components/PropertyCard.tsx`**

```typescript
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { formatNaira } from '../lib/format';
import { calculateSavings } from '../lib/savings';
import { PROPERTY_IMAGES } from '../data/seedListings';
import type { Listing } from '../types';

interface PropertyCardProps {
  listing: Listing;
  onPress: () => void;
}

export default function PropertyCard({ listing, onPress }: PropertyCardProps) {
  const image = PROPERTY_IMAGES[listing.media.photoKey];
  const { savings } = calculateSavings(listing.pricing.annualRent);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={listing.basicInfo.title}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {image ? (
        <Image source={image} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderArea}>{listing.location.area}</Text>
          <Text style={styles.placeholderType}>
            {listing.basicInfo.bedrooms} bed · {listing.basicInfo.bathrooms} bath
          </Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {listing.basicInfo.title}
        </Text>
        <Text style={styles.area}>{listing.location.area}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.rent}>{formatNaira(listing.pricing.annualRent)}</Text>
          <Text style={styles.perYear}>/year</Text>
        </View>

        <View style={styles.savingsChip}>
          <Text style={styles.savingsChipText}>Save {formatNaira(savings)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundPaper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  pressed: { opacity: 0.9 },
  image: { width: '100%', height: 180 },
  placeholder: {
    width: '100%',
    height: 180,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderArea: {
    color: colors.accentGold,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['2xl'],
  },
  placeholderType: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  body: { padding: spacing.md },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.lg,
  },
  area: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.sm },
  rent: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
  },
  perYear: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginLeft: spacing.xs,
  },
  savingsChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.successDark,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  savingsChipText: {
    color: colors.textPrimary,
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.xs,
  },
});
```

- [ ] **Step 3: Replace `src/screens/BrowseScreen.tsx`**

```typescript
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing } from '../theme/tokens';
import PropertyCard from '../components/PropertyCard';
import EmptyState from '../components/EmptyState';
import { fetchListings } from '../services/listings';
import type { Listing } from '../types';
import type { BrowseStackParams } from '../navigation/AppTabs';

type Props = NativeStackScreenProps<BrowseStackParams, 'BrowseList'>;

export default function BrowseScreen({ navigation }: Props) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setListings(await fetchListings());
    } catch {
      setError('Could not load properties. Pull down to try again.');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={colors.accentGold} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.wrapper} edges={['left', 'right']}>
      <FlatList
        data={listings}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accentGold}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.heading}>Rent directly in Lagos</Text>
            <Text style={styles.sub}>
              {listings.length} verified {listings.length === 1 ? 'property' : 'properties'} · no agent fees
            </Text>
            {!!error && <Text style={styles.error}>{error}</Text>}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="🏠"
            title="No properties yet"
            body="Listings will appear here once they are published. Pull down to refresh."
          />
        }
        renderItem={({ item }) => (
          <PropertyCard
            listing={item}
            onPress={() => navigation.navigate('ListingDetail', { listingId: item.id })}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  centre: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: spacing.md, flexGrow: 1 },
  header: { marginBottom: spacing.md },
  heading: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['2xl'],
  },
  sub: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  error: {
    color: colors.errorLight,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
  },
});
```

- [ ] **Step 4: VERIFY ON DEVICE — Gate 2a**

Browse shows the empty state (seeding happens in Task 13). No red error screen. Pull-to-refresh works.

- [ ] **Step 5: Commit**

```bash
git add src/services/listings.ts src/components/PropertyCard.tsx src/screens/BrowseScreen.tsx
git commit -m "feat: add listings service, property card and browse screen"
```

---

## Task 12: Listing Detail and the Savings Breakdown

**Files:**
- Create: `src/components/SavingsBreakdown.tsx`
- Create: `src/screens/ListingDetailScreen.tsx`

- [ ] **Step 1: Create `src/components/SavingsBreakdown.tsx`**

```typescript
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { formatNaira } from '../lib/format';
import {
  calculateSavings,
  TRADITIONAL_FEE_LABEL,
  DIRECTRENT_FEE_LABEL,
  SAVINGS_LABEL,
} from '../lib/savings';

interface SavingsBreakdownProps {
  annualRent: number;
}

export default function SavingsBreakdown({ annualRent }: SavingsBreakdownProps) {
  const { traditionalFees, directrentFee, savings } = calculateSavings(annualRent);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>What you save renting directly</Text>

      <Row label="Annual Rent" value={formatNaira(annualRent)} />
      <Row label={TRADITIONAL_FEE_LABEL} value={formatNaira(traditionalFees)} muted />
      <Row label={DIRECTRENT_FEE_LABEL} value={formatNaira(directrentFee)} muted />

      <View style={styles.divider} />

      <View style={styles.savingsRow}>
        <Text style={styles.savingsLabel}>{SAVINGS_LABEL}</Text>
        <Text style={styles.savingsValue}>{formatNaira(savings)}</Text>
      </View>

      <Text style={styles.footnote}>
        Traditional fees combine agency, legal, caution and inspection charges —
        typically 32% of annual rent. We charge 2%.
      </Text>
    </View>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, muted && styles.rowLabelMuted]}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundPaper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderGold,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.lg,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  rowLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    paddingRight: spacing.sm,
  },
  rowLabelMuted: { color: colors.textSecondary },
  rowValue: {
    color: colors.textPrimary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  savingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  savingsLabel: {
    color: colors.accentGold,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.lg,
  },
  savingsValue: {
    color: colors.accentGold,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['2xl'],
  },
  footnote: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
    marginTop: spacing.md,
  },
});
```

- [ ] **Step 2: Create `src/screens/ListingDetailScreen.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing, radius } from '../theme/tokens';
import Button from '../components/Button';
import SavingsBreakdown from '../components/SavingsBreakdown';
import { formatNaira } from '../lib/format';
import { fetchListing } from '../services/listings';
import { isSaved, toggleSaved } from '../services/saved';
import { useAuth } from '../context/AuthContext';
import { PROPERTY_IMAGES } from '../data/seedListings';
import type { Listing } from '../types';
import type { BrowseStackParams } from '../navigation/AppTabs';

type Props = NativeStackScreenProps<BrowseStackParams, 'ListingDetail'>;

export default function ListingDetailScreen({ route }: Props) {
  const { listingId } = route.params;
  const { profile } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const result = await fetchListing(listingId);
      setListing(result);
      if (profile) setSaved(await isSaved(profile.uid, listingId));
      setLoading(false);
    }
    load();
  }, [listingId, profile]);

  async function handleToggleSave() {
    if (!profile) return;
    const next = await toggleSaved(profile.uid, listingId);
    setSaved(next);
  }

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={colors.accentGold} />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.centre}>
        <Text style={styles.missing}>This property is no longer available.</Text>
      </View>
    );
  }

  const image = PROPERTY_IMAGES[listing.media.photoKey];

  return (
    <ScrollView style={styles.wrapper} contentContainerStyle={styles.content}>
      {image ? (
        <Image source={image} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderArea}>{listing.location.area}</Text>
        </View>
      )}

      <Text style={styles.title}>{listing.basicInfo.title}</Text>
      <Text style={styles.address}>{listing.location.address}</Text>

      <View style={styles.priceRow}>
        <Text style={styles.rent}>{formatNaira(listing.pricing.annualRent)}</Text>
        <Text style={styles.perYear}>/year</Text>
      </View>

      <View style={styles.facts}>
        <Fact value={String(listing.basicInfo.bedrooms)} label="Bedrooms" />
        <Fact value={String(listing.basicInfo.bathrooms)} label="Bathrooms" />
        <Fact value={String(listing.details.maxOccupants)} label="Max occupants" />
      </View>

      <SavingsBreakdown annualRent={listing.pricing.annualRent} />

      <Text style={styles.sectionHeading}>About this property</Text>
      <Text style={styles.description}>{listing.details.description}</Text>

      <Text style={styles.sectionHeading}>Amenities</Text>
      <View style={styles.amenities}>
        {listing.details.amenities.map(amenity => (
          <View key={amenity} style={styles.amenityChip}>
            <Text style={styles.amenityText}>{amenity}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          label={saved ? '♥ Saved' : '♡ Save this property'}
          variant="secondary"
          onPress={handleToggleSave}
        />
      </View>
    </ScrollView>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factValue}>{value}</Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing['2xl'] },
  centre: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missing: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
  },
  image: { width: '100%', height: 240, borderRadius: radius.lg },
  placeholder: {
    width: '100%',
    height: 240,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderArea: {
    color: colors.accentGold,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['3xl'],
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['2xl'],
    marginTop: spacing.md,
  },
  address: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.md },
  rent: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['3xl'],
  },
  perYear: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    marginLeft: spacing.xs,
  },
  facts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundPaper,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  fact: { alignItems: 'center', flex: 1 },
  factValue: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
  },
  factLabel: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  sectionHeading: {
    color: colors.textPrimary,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  description: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    lineHeight: 24,
  },
  amenities: { flexDirection: 'row', flexWrap: 'wrap' },
  amenityChip: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  amenityText: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
  },
  actions: { marginTop: spacing.lg },
});
```

- [ ] **Step 3: Commit** (device verification happens in Task 13, once data exists)

```bash
git add src/components/SavingsBreakdown.tsx src/screens/ListingDetailScreen.tsx
git commit -m "feat: add listing detail with savings breakdown"
```

---

## Task 13: Saved Properties, Profile and Seeding — Device Gate 2 and 3

**Files:**
- Create: `src/services/saved.ts`
- Modify: `src/screens/SavedScreen.tsx`
- Modify: `src/screens/MessagesScreen.tsx`
- Modify: `src/screens/ProfileScreen.tsx`

- [ ] **Step 1: Create `src/services/saved.ts`**

```typescript
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from '@react-native-firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';

/** Saved listings live at users/{uid}/saved/{listingId}. */
function savedDoc(uid: string, listingId: string) {
  return doc(db, COLLECTIONS.users, uid, COLLECTIONS.saved, listingId);
}

export async function isSaved(uid: string, listingId: string): Promise<boolean> {
  const snapshot = await getDoc(savedDoc(uid, listingId));
  return snapshot.exists();
}

/** Toggles saved state. Returns the new state. */
export async function toggleSaved(uid: string, listingId: string): Promise<boolean> {
  const ref = savedDoc(uid, listingId);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    await deleteDoc(ref);
    return false;
  }

  await setDoc(ref, { savedAt: Date.now() });
  return true;
}

/** Returns the listing IDs this user has saved. */
export async function fetchSavedIds(uid: string): Promise<string[]> {
  const snapshot = await getDocs(collection(db, COLLECTIONS.users, uid, COLLECTIONS.saved));
  return snapshot.docs.map(d => d.id);
}
```

- [ ] **Step 2: Replace `src/screens/SavedScreen.tsx`**

```typescript
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../theme/tokens';
import PropertyCard from '../components/PropertyCard';
import EmptyState from '../components/EmptyState';
import { fetchListings } from '../services/listings';
import { fetchSavedIds } from '../services/saved';
import { useAuth } from '../context/AuthContext';
import type { Listing } from '../types';

export default function SavedScreen() {
  const { profile } = useAuth();
  const navigation = useNavigation<any>();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        if (!profile) return;
        const [all, savedIds] = await Promise.all([fetchListings(), fetchSavedIds(profile.uid)]);
        if (!active) return;
        setListings(all.filter(l => savedIds.includes(l.id)));
        setLoading(false);
      }

      load();
      return () => {
        active = false;
      };
    }, [profile]),
  );

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={colors.accentGold} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.wrapper}>
      <FlatList
        data={listings}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="♥"
            title="Nothing saved yet"
            body="Tap the save button on any property and it will appear here."
          />
        }
        renderItem={({ item }) => (
          <PropertyCard
            listing={item}
            onPress={() =>
              navigation.navigate('Browse', {
                screen: 'ListingDetail',
                params: { listingId: item.id },
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  centre: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: spacing.md, flexGrow: 1 },
});
```

- [ ] **Step 3: Replace `src/screens/MessagesScreen.tsx`**

```typescript
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';
import EmptyState from '../components/EmptyState';

export default function MessagesScreen() {
  return (
    <View style={styles.wrapper}>
      <EmptyState
        icon="💬"
        title="No messages yet"
        body="When you contact a landlord about a property, your conversations will appear here."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
});
```

- [ ] **Step 4: Replace `src/screens/ProfileScreen.tsx`**

The seed button is a demo affordance. Task 14 removes it before the client sees the app.

```typescript
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../theme/tokens';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { seedListings } from '../../scripts/seed';
import type { UserRole } from '../types';

const ROLE_LABELS: Record<UserRole, string> = {
  tenant: 'Tenant',
  landlord: 'Landlord',
  both: 'Tenant & Landlord',
};

export default function ProfileScreen() {
  const { profile, logOut, setRole } = useAuth();
  const [seeding, setSeeding] = useState(false);

  if (!profile) return null;

  async function handleSeed() {
    setSeeding(true);
    try {
      const count = await seedListings();
      Alert.alert('Seeded', `${count} properties written to Firestore.`);
    } catch (err: any) {
      Alert.alert('Seeding failed', err?.message ?? 'Unknown error');
    } finally {
      setSeeding(false);
    }
  }

  return (
    <SafeAreaView style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile.fullName.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>

        <Text style={styles.name}>{profile.fullName}</Text>
        <Text style={styles.email}>{profile.email}</Text>

        <Text style={styles.sectionHeading}>Your role</Text>
        <View style={styles.roleRow}>
          {(['tenant', 'landlord', 'both'] as UserRole[]).map(role => (
            <Pressable
              key={role}
              onPress={() => setRole(role)}
              style={[styles.rolePill, profile.role === role && styles.rolePillActive]}
            >
              <Text
                style={[
                  styles.rolePillText,
                  profile.role === role && styles.rolePillTextActive,
                ]}
              >
                {ROLE_LABELS[role]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionHeading}>Demo tools</Text>
        <Button label="Seed demo listings" variant="secondary" onPress={handleSeed} loading={seeding} />

        <View style={styles.logout}>
          <Button label="Log out" onPress={logOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, alignItems: 'stretch' },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentGoldDark,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  avatarText: {
    color: colors.primaryDark,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['3xl'],
  },
  name: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['2xl'],
    textAlign: 'center',
    marginTop: spacing.md,
  },
  email: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  sectionHeading: {
    color: colors.textPrimary,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap' },
  rolePill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  rolePillActive: { borderColor: colors.accentGold, backgroundColor: colors.backgroundElevated },
  rolePillText: {
    color: colors.textSecondary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
  },
  rolePillTextActive: { color: colors.accentGold },
  logout: { marginTop: spacing.xl },
});
```

- [ ] **Step 5: VERIFY ON DEVICE — Gate 2 and Gate 3**

1. Open Profile → tap **Seed demo listings**. Expect an alert: "6 properties written to Firestore."
2. Go to Browse → six properties appear, each with title, area, annual rent and a green "Save ₦…" chip.
3. Tap the ₦1,000,000 Surulere two-bedroom. The breakdown must read **exactly**:
   - Annual Rent — ₦1,000,000
   - Traditional Fees (Agent + Legal + Misc) — ₦320,000
   - Directrent.ng Fee (2%) — ₦20,000
   - **Your Savings — ₦300,000**
4. Tap "Save this property" → label changes to "♥ Saved".
5. Go to the Saved tab → the property is listed.
6. **Force-quit and reopen** → still signed in, and the property is still saved.
7. Messages tab shows the empty state.
8. Profile → Log out returns to the Welcome screen.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add saved properties, messages empty state and profile"
```

---

## Task 14: Brand Audit and Demo Rehearsal — Gate 4

**Files:**
- Modify: `src/screens/ProfileScreen.tsx` (remove the seed button)

- [ ] **Step 1: Run the brand-rule audit**

```bash
cd "C:/Projects/directrent.ng-app2" && echo "=== forbidden words (expect NO hits) ===" && grep -rn -i "MBA\|capstone\|Rome Business\|academic project\|school project" src/ App.tsx scripts/ 2>/dev/null || echo "  clean" && echo "=== naira escape sequences (expect NO hits) ===" && grep -rn "u20A6\|&#x20A6" src/ 2>/dev/null || echo "  clean" && echo "=== wrong fee label (expect NO hits) ===" && grep -rn "Agent Fee" src/ 2>/dev/null || echo "  clean"
```

All three must report `clean`. Fix anything that appears.

- [ ] **Step 2: Run the test suite**

```bash
npm test
```

Expected: PASS, 15 tests.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Remove the seed button**

Once listings are seeded, delete from `ProfileScreen.tsx`: the `seedListings` import, the `seeding` state, the `handleSeed` function, and the "Demo tools" heading and its Button. Leave everything else.

- [ ] **Step 5: Rehearse the full journey on the device**

Run through the spec's §8 acceptance criteria end to end, twice — once signed out (fresh account), once returning (existing account). Both must complete without a red screen.

- [ ] **Step 6: Verify offline resilience**

Open the app, let Browse load, enable aeroplane mode, force-quit, reopen. Listings should still appear from Firestore's local cache. If they do not, note it — the demo then requires working wifi.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove demo seed button and pass brand audit"
```

---

## Self-Review Notes

**Spec coverage:** all nine screens from spec §2.1 are implemented (Tasks 7–13); the savings breakdown (§4) is Task 12; email/password auth (§5.1) is Task 5; navigation (§5.2) is Task 7; the trimmed listing schema (§5.3) is Task 3; bundled images (§5.4, §6) are Task 10; the four gates (§7) map to Tasks 7, 11, 13 and 14; all ten acceptance criteria (§8) are checked in Task 14 Step 5.

**Known deviations, both deliberate:**
1. **TDD applies only to pure logic** — reasoning in "Testing Approach" above.
2. **Seeding runs in-app rather than as a Node script** — the native Firebase SDK requires an app context, so a standalone `node scripts/seed.ts` cannot authenticate. The button is removed in Task 14.

**Ordering caveat:** Task 7 imports screens created in Tasks 8, 9 and 12. Working strictly in order requires one-line placeholders for those, noted in Task 7 Step 6.
