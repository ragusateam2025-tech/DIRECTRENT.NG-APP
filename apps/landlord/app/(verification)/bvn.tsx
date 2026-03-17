/**
 * Landlord BVN Verification Screen
 */
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import functions from '@react-native-firebase/functions';
import { useDispatch } from 'react-redux';
import { setProfile } from '../../store/authSlice';
import auth from '@react-native-firebase/auth';
import { AuthService } from '../../services/auth.service';

const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const ERROR = '#D32F2F';
const TEXT = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';

export default function BvnVerificationScreen() {
  const [bvn, setBvn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const dispatch = useDispatch();
  const isValid = /^\d{11}$/.test(bvn);

  const handleChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 11);
    setBvn(cleaned);
    if (error) setError(null);
  };

  const handleVerify = useCallback(async () => {
    if (!isValid || loading) return;
    setLoading(true);
    setError(null);

    try {
      const verifyBvn = functions().httpsCallable('verifyBvn');
      await verifyBvn({ bvn });
      setSuccess(true);

      const user = auth().currentUser;
      if (user) {
        const updatedProfile = await AuthService.getUserProfile(user.uid);
        dispatch(setProfile(updatedProfile));
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      const message = (err as Error)?.message ?? 'Verification failed. Please try again.';

      if (code === 'functions/already-exists') {
        setError('This BVN is already linked to another account.');
      } else if (code === 'functions/not-found') {
        setError('BVN not found. Please check the number and try again.');
      } else if (code === 'functions/failed-precondition') {
        setError('The name on your BVN does not match your profile name.');
      } else if (code === 'functions/unavailable') {
        setError('Verification service temporarily unavailable. Please try again.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [bvn, isValid, loading, dispatch]);

  if (success) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}><Text style={styles.successCheck}>✓</Text></View>
          <Text style={styles.successTitle}>BVN Verified!</Text>
          <Text style={styles.successSubtitle}>
            Identity confirmed. You can now verify property ownership to start listing.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/(verification)/ownership')} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Verify Property Ownership →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipButton} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.skipText}>Do this later</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.iconWrapper}><Text style={styles.icon}>🏦</Text></View>
          <Text style={styles.heading}>BVN Verification</Text>
          <Text style={styles.subheading}>Verify your identity to build trust with prospective tenants.</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Find your BVN</Text>
            <Text style={styles.infoText}>Dial <Text style={styles.infoCode}>*565*0#</Text> on your registered bank phone number to get your 11-digit BVN.</Text>
          </View>
          <Text style={styles.label}>Enter your BVN</Text>
          <View style={[styles.inputWrapper, error ? styles.inputWrapperError : null, isValid && !error ? styles.inputWrapperValid : null]}>
            <TextInput
              style={styles.input} value={bvn} onChangeText={handleChange}
              placeholder="Enter 11-digit BVN" placeholderTextColor="#BDBDBD"
              keyboardType="number-pad" maxLength={11} autoFocus editable={!loading}
              selectionColor={PRIMARY} returnKeyType="done" onSubmitEditing={handleVerify}
            />
            {bvn.length > 0 && <Text style={[styles.charCount, isValid && styles.charCountValid]}>{bvn.length}/11</Text>}
          </View>
          {error && <View style={styles.errorContainer}><Text style={styles.errorText}>{error}</Text></View>}
          <View style={styles.securityNote}>
            <Text style={styles.securityNoteText}>🔒 Your BVN is never stored. Only the last 4 digits and a secure hash are saved.</Text>
          </View>
          <TouchableOpacity
            style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
            onPress={handleVerify} disabled={!isValid || loading} activeOpacity={0.85}
          >
            {loading ? (
              <View style={styles.loadingRow}><ActivityIndicator color="#fff" size="small" /><Text style={styles.buttonText}>Verifying...</Text></View>
            ) : (
              <Text style={styles.buttonText}>Verify BVN</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipButton} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.skipText}>Verify later</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16, marginLeft: -8 },
  backIcon: { fontSize: 22, color: TEXT, fontWeight: '600' },
  iconWrapper: { alignItems: 'center', marginBottom: 16 },
  icon: { fontSize: 56 },
  heading: { fontSize: 26, fontWeight: '700', color: TEXT, marginBottom: 8, textAlign: 'center' },
  subheading: { fontSize: 15, color: TEXT_SECONDARY, lineHeight: 22, marginBottom: 24, textAlign: 'center' },
  infoCard: { backgroundColor: '#E3F2FD', borderRadius: 12, padding: 16, marginBottom: 28, borderLeftWidth: 3, borderLeftColor: '#1976D2' },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#1565C0', marginBottom: 6 },
  infoText: { fontSize: 13, color: '#1A237E', lineHeight: 20 },
  infoCode: { fontFamily: 'monospace', fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', color: TEXT, marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BORDER, borderRadius: 12, backgroundColor: '#FAFAFA', height: 56, paddingHorizontal: 16, marginBottom: 8 },
  inputWrapperError: { borderColor: ERROR },
  inputWrapperValid: { borderColor: PRIMARY },
  input: { flex: 1, fontSize: 20, color: TEXT, fontWeight: '600', letterSpacing: 2 },
  charCount: { fontSize: 13, color: '#9E9E9E', fontWeight: '500' },
  charCountValid: { color: PRIMARY },
  errorContainer: { backgroundColor: '#FFEBEE', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: ERROR, marginBottom: 16 },
  errorText: { fontSize: 13, color: ERROR, lineHeight: 18 },
  securityNote: { backgroundColor: PRIMARY_LIGHT, borderRadius: 10, padding: 14, marginBottom: 28 },
  securityNoteText: { fontSize: 12, color: '#2E7D32', lineHeight: 18 },
  button: { backgroundColor: PRIMARY, borderRadius: 12, height: 54, alignItems: 'center', justifyContent: 'center', shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4, marginBottom: 16 },
  buttonDisabled: { backgroundColor: '#A5D6A7', shadowOpacity: 0, elevation: 0 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  skipButton: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 14, color: TEXT_SECONDARY, textDecorationLine: 'underline' },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: PRIMARY_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 3, borderColor: PRIMARY },
  successCheck: { fontSize: 36, color: PRIMARY, fontWeight: '700' },
  successTitle: { fontSize: 28, fontWeight: '700', color: PRIMARY, marginBottom: 12 },
  successSubtitle: { fontSize: 15, color: TEXT_SECONDARY, lineHeight: 22, textAlign: 'center', marginBottom: 32 },
});
