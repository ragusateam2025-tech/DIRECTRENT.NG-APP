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

export default function ProfileScreen() {
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

  const onSubmit = async (data: ProfileFormData) => {
    const user = auth().currentUser;
    if (!user) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const input: CreateProfileInput = {
        userType: 'landlord',
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim().toLowerCase(),
      };

      await AuthService.createProfile(user.uid, input);

      const updatedProfile = await AuthService.getUserProfile(user.uid);
      dispatch(setProfile(updatedProfile));
      // AuthGuard in _layout.tsx handles navigation to /(tabs)
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>directrent</Text>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>for Landlords</Text>
            </View>
          </View>

          <Text style={styles.heading}>Set up your account</Text>
          <Text style={styles.subheading}>
            Help verified tenants trust you as a property owner
          </Text>

          {/* Landlord benefits */}
          <View style={styles.benefitsCard}>
            <Text style={styles.benefitsTitle}>🔑 What you get as a landlord</Text>
            {[
              '✓ List your first property free',
              '✓ Receive verified tenant applications',
              '✓ Collect rent payments directly',
              '✓ Property analytics & insights',
            ].map((benefit) => (
              <Text key={benefit} style={styles.benefitItem}>{benefit}</Text>
            ))}
          </View>

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
                  placeholder="e.g. Adeola"
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
                  placeholder="e.g. Johnson"
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
                  placeholder="e.g. adeola@example.com"
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

          {/* Identity verification note */}
          <View style={styles.verifyNote}>
            <Text style={styles.verifyNoteText}>
              🔒 After setup, you'll verify your identity with{' '}
              <Text style={styles.verifyNoteBold}>BVN / NIN</Text> and upload
              property ownership documents to start listing.
            </Text>
          </View>

          {submitError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{submitError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Create Landlord Profile</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Your information is protected under our Privacy Policy and Nigeria's NDPR.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 28, fontWeight: '700', color: PRIMARY, letterSpacing: -0.5 },
  logoBadge: { marginTop: 6, backgroundColor: PRIMARY_LIGHT, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100 },
  logoBadgeText: { fontSize: 12, color: PRIMARY, fontWeight: '500' },
  heading: { fontSize: 26, fontWeight: '700', color: TEXT, marginBottom: 8 },
  subheading: { fontSize: 15, color: TEXT_SECONDARY, marginBottom: 24, lineHeight: 22 },
  benefitsCard: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
  },
  benefitsTitle: { fontSize: 14, fontWeight: '700', color: PRIMARY, marginBottom: 10 },
  benefitItem: { fontSize: 13, color: '#2E7D32', lineHeight: 24 },
  field: { marginBottom: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: TEXT, marginBottom: 8 },
  fieldInput: {
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, height: 50,
    paddingHorizontal: 14, fontSize: 16, color: TEXT, backgroundColor: '#FAFAFA',
  },
  fieldInputError: { borderColor: ERROR },
  fieldError: { marginTop: 6, fontSize: 12, color: ERROR },
  verifyNote: {
    backgroundColor: '#FFF8E1', borderRadius: 10, padding: 14,
    marginBottom: 24, borderLeftWidth: 3, borderLeftColor: '#F9A825',
  },
  verifyNoteText: { fontSize: 13, color: '#5D4037', lineHeight: 19 },
  verifyNoteBold: { fontWeight: '700' },
  errorContainer: {
    backgroundColor: '#FFEBEE', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 8, borderLeftWidth: 3, borderLeftColor: ERROR, marginBottom: 20,
  },
  errorText: { fontSize: 13, color: ERROR, lineHeight: 18 },
  button: {
    backgroundColor: PRIMARY, borderRadius: 12, height: 54,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4, marginBottom: 16,
  },
  buttonDisabled: { backgroundColor: '#A5D6A7', shadowOpacity: 0, elevation: 0 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  disclaimer: { textAlign: 'center', fontSize: 12, color: '#9E9E9E', lineHeight: 18 },
});
