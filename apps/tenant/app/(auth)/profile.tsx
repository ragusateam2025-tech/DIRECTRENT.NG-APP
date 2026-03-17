import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import auth from '@react-native-firebase/auth';
import { AuthService, CreateProfileInput } from '../../services/auth.service';
import { useDispatch } from 'react-redux';
import { setProfile } from '../../store/authSlice';

const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const ERROR = '#D32F2F';
const TEXT = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const ACTIVE_BORDER = PRIMARY;

// Form validation schema
const profileSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name is too long')
    .regex(/^[a-zA-Z\-' ]+$/, 'First name can only contain letters'),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name is too long')
    .regex(/^[a-zA-Z\-' ]+$/, 'Last name can only contain letters'),
  email: z
    .string()
    .email('Please enter a valid email address')
    .toLowerCase(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

type Step = 'role' | 'details';
type UserRole = 'tenant' | 'landlord';

const ROLE_OPTIONS: Array<{
  role: UserRole;
  emoji: string;
  title: string;
  subtitle: string;
  features: string[];
}> = [
  {
    role: 'tenant',
    emoji: '🏠',
    title: "I'm looking for a place",
    subtitle: 'Find and rent apartments directly from landlords',
    features: ['Browse verified listings', 'No agent fees', 'Secure escrow payments'],
  },
  {
    role: 'landlord',
    emoji: '🔑',
    title: 'I have property to rent',
    subtitle: 'List your property and connect with verified tenants',
    features: ['Verified tenant profiles', 'Direct payments', 'Free first listing'],
  },
];

export default function ProfileScreen() {
  const [step, setStep] = useState<Step>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const dispatch = useDispatch();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: '', lastName: '', email: '' },
  });

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
  };

  const handleRoleContinue = () => {
    if (selectedRole) setStep('details');
  };

  const onSubmit = async (data: ProfileFormData) => {
    const user = auth().currentUser;
    if (!user || !selectedRole) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const input: CreateProfileInput = {
        userType: selectedRole,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
      };

      await AuthService.createProfile(user.uid, input);

      // Refresh profile in Redux — auth state listener will handle navigation
      const updatedProfile = await AuthService.getUserProfile(user.uid);
      dispatch(setProfile(updatedProfile));
      // Navigation is handled by AuthGuard in _layout.tsx
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create profile. Please try again.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          <StepDot active={step === 'role'} completed={step === 'details'} label="Role" />
          <View style={styles.stepLine} />
          <StepDot active={step === 'details'} completed={false} label="Details" />
        </View>

        {step === 'role' ? (
          <RoleStep
            selectedRole={selectedRole}
            onSelect={handleRoleSelect}
            onContinue={handleRoleContinue}
          />
        ) : (
          <DetailsStep
            role={selectedRole!}
            control={control}
            errors={errors}
            submitting={submitting}
            submitError={submitError}
            onBack={() => setStep('role')}
            onSubmit={handleSubmit(onSubmit)}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Step 1: Role Selection ───────────────────────────────────────────────────

function RoleStep({
  selectedRole,
  onSelect,
  onContinue,
}: {
  selectedRole: UserRole | null;
  onSelect: (role: UserRole) => void;
  onContinue: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading}>Welcome to Directrent!</Text>
      <Text style={styles.subheading}>How will you use the app?</Text>

      {ROLE_OPTIONS.map(({ role, emoji, title, subtitle, features }) => {
        const selected = selectedRole === role;
        return (
          <TouchableOpacity
            key={role}
            style={[styles.roleCard, selected && styles.roleCardSelected]}
            onPress={() => onSelect(role)}
            activeOpacity={0.8}
          >
            {/* Selection indicator */}
            <View style={styles.roleHeader}>
              <View style={[styles.roleEmoji, selected && styles.roleEmojiSelected]}>
                <Text style={styles.roleEmojiText}>{emoji}</Text>
              </View>
              <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                {selected && <View style={styles.radioInner} />}
              </View>
            </View>

            <Text style={[styles.roleTitle, selected && styles.roleTitleSelected]}>
              {title}
            </Text>
            <Text style={styles.roleSubtitle}>{subtitle}</Text>

            <View style={styles.featureList}>
              {features.map((feature) => (
                <View key={feature} style={styles.featureRow}>
                  <Text style={[styles.featureCheck, selected && styles.featureCheckSelected]}>✓</Text>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        style={[styles.button, !selectedRole && styles.buttonDisabled]}
        onPress={onContinue}
        disabled={!selectedRole}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Step 2: Profile Details ──────────────────────────────────────────────────

function DetailsStep({
  role,
  control,
  errors,
  submitting,
  submitError,
  onBack,
  onSubmit,
}: {
  role: UserRole;
  control: ReturnType<typeof useForm<ProfileFormData>>['control'];
  errors: ReturnType<typeof useForm<ProfileFormData>>['formState']['errors'];
  submitting: boolean;
  submitError: string | null;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Back */}
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backIcon}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>
        {role === 'tenant' ? 'Create your profile' : 'Set up your account'}
      </Text>
      <Text style={styles.subheading}>
        {role === 'tenant'
          ? 'Landlords will use this to evaluate your application'
          : 'Help tenants trust you as a verified landlord'}
      </Text>

      {/* First name */}
      <FormField label="First name" error={errors.firstName?.message}>
        <Controller
          control={control}
          name="firstName"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.fieldInput, errors.firstName && styles.fieldInputError]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="e.g. Chidi"
              placeholderTextColor="#BDBDBD"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              editable={!submitting}
              selectionColor={PRIMARY}
            />
          )}
        />
      </FormField>

      {/* Last name */}
      <FormField label="Last name" error={errors.lastName?.message}>
        <Controller
          control={control}
          name="lastName"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.fieldInput, errors.lastName && styles.fieldInputError]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="e.g. Okonkwo"
              placeholderTextColor="#BDBDBD"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              editable={!submitting}
              selectionColor={PRIMARY}
            />
          )}
        />
      </FormField>

      {/* Email */}
      <FormField label="Email address" error={errors.email?.message}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              style={[styles.fieldInput, errors.email && styles.fieldInputError]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="e.g. chidi@example.com"
              placeholderTextColor="#BDBDBD"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              editable={!submitting}
              selectionColor={PRIMARY}
            />
          )}
        />
      </FormField>

      {/* Verification note */}
      <View style={styles.verifyNote}>
        <Text style={styles.verifyNoteText}>
          🔒 After signing up, you can optionally verify your identity with{' '}
          <Text style={styles.verifyNoteBold}>BVN / NIN</Text> to unlock messaging
          and applications.
        </Text>
      </View>

      {/* Submit error */}
      {submitError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{submitError}</Text>
        </View>
      )}

      {/* Submit button */}
      <TouchableOpacity
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>
            {role === 'tenant' ? 'Create Tenant Profile' : 'Create Landlord Profile'}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Your information is protected under our Privacy Policy and Nigeria's NDPR.
      </Text>
    </ScrollView>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function StepDot({
  active,
  completed,
  label,
}: {
  active: boolean;
  completed: boolean;
  label: string;
}) {
  return (
    <View style={styles.stepDotWrapper}>
      <View
        style={[
          styles.stepDot,
          active && styles.stepDotActive,
          completed && styles.stepDotCompleted,
        ]}
      >
        {completed ? (
          <Text style={styles.stepDotCheckText}>✓</Text>
        ) : (
          <View style={active ? styles.stepDotInnerActive : styles.stepDotInner} />
        )}
      </View>
      <Text style={[styles.stepDotLabel, active && styles.stepDotLabelActive]}>
        {label}
      </Text>
    </View>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },

  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  stepDotWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  stepDotActive: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_LIGHT,
  },
  stepDotCompleted: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY,
  },
  stepDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#BDBDBD',
  },
  stepDotInnerActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY,
  },
  stepDotCheckText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  stepDotLabel: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  stepDotLabelActive: {
    color: PRIMARY,
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: BORDER,
    marginHorizontal: 8,
    marginBottom: 16,
  },

  // Heading
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 8,
    marginTop: 16,
  },
  subheading: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    marginBottom: 28,
    lineHeight: 22,
  },

  // Back button
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginBottom: 8,
  },
  backIcon: {
    fontSize: 15,
    color: PRIMARY,
    fontWeight: '600',
  },

  // Role cards
  roleCard: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  roleCardSelected: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_LIGHT,
  },
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roleEmoji: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  roleEmojiSelected: {
    borderColor: PRIMARY,
    backgroundColor: '#fff',
  },
  roleEmojiText: {
    fontSize: 26,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: PRIMARY,
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: PRIMARY,
  },
  roleTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT,
    marginBottom: 4,
  },
  roleTitleSelected: {
    color: PRIMARY,
  },
  roleSubtitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginBottom: 14,
    lineHeight: 20,
  },
  featureList: {
    gap: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureCheck: {
    fontSize: 13,
    color: '#9E9E9E',
    fontWeight: '700',
    width: 16,
  },
  featureCheckSelected: {
    color: PRIMARY,
  },
  featureText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },

  // Form fields
  field: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT,
    marginBottom: 8,
  },
  fieldInput: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 10,
    height: 50,
    paddingHorizontal: 14,
    fontSize: 16,
    color: TEXT,
    backgroundColor: '#FAFAFA',
  },
  fieldInputError: {
    borderColor: ERROR,
  },
  fieldError: {
    marginTop: 6,
    fontSize: 12,
    color: ERROR,
  },

  // Verification note
  verifyNote: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#F9A825',
  },
  verifyNoteText: {
    fontSize: 13,
    color: '#5D4037',
    lineHeight: 19,
  },
  verifyNoteBold: {
    fontWeight: '700',
  },

  // Error
  errorContainer: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: ERROR,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 13,
    color: ERROR,
    lineHeight: 18,
  },

  // Button
  button: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#A5D6A7',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Disclaimer
  disclaimer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9E9E9E',
    lineHeight: 18,
  },
});
