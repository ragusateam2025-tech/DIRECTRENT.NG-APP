import { useState, useCallback } from 'react';
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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { normalizePhone, isValidNigerianPhone } from '@directrent/shared';
import { AuthService } from '../../services/auth.service';

const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const ERROR = '#D32F2F';
const TEXT = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedPhone = normalizePhone(phone.trim());
  const isValid = isValidNigerianPhone(normalizedPhone);

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setPhone(cleaned);
    if (error) setError(null);
  };

  const handleContinue = useCallback(async () => {
    if (!isValid || loading) return;

    setLoading(true);
    setError(null);

    try {
      await AuthService.sendOTP(normalizedPhone);
      router.push({
        pathname: '/(auth)/otp',
        params: { phone: normalizedPhone },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send verification code';
      if (message.toLowerCase().includes('quota') || message.toLowerCase().includes('blocked')) {
        setError('SMS service temporarily unavailable. Please try again in a few minutes.');
      } else if (message.toLowerCase().includes('invalid')) {
        setError('Please enter a valid Nigerian phone number.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [isValid, loading, normalizedPhone]);

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
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>directrent</Text>
            <View style={styles.logoBadge}>
              <Text style={styles.logoBadgeText}>for Landlords</Text>
            </View>
          </View>

          {/* Heading */}
          <Text style={styles.heading}>Enter your phone number</Text>
          <Text style={styles.subheading}>
            List properties and connect with verified tenants
          </Text>

          {/* Phone Input */}
          <View style={[styles.inputWrapper, error ? styles.inputWrapperError : null]}>
            <View style={styles.countryCode}>
              <Text style={styles.flag}>🇳🇬</Text>
              <Text style={styles.countryCodeText}>+234</Text>
            </View>
            <View style={styles.inputDivider} />
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={handlePhoneChange}
              placeholder="0801 234 5678"
              placeholderTextColor="#BDBDBD"
              keyboardType="phone-pad"
              autoFocus
              maxLength={11}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              editable={!loading}
              selectionColor={PRIMARY}
            />
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.helperText}>Enter in format: 08012345678</Text>

          <TouchableOpacity
            style={[styles.button, (!isValid || loading) && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.terms}>
            By continuing, you agree to our{' '}
            <Text style={styles.link}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.link}>Privacy Policy</Text>
          </Text>

          <View style={styles.trustRow}>
            <TrustPill emoji="🔑" label="Free Listing" />
            <TrustPill emoji="✓" label="Verified Tenants" />
            <TrustPill emoji="₦" label="No Agent Fees" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TrustPill({ emoji, label }: { emoji: string; label: string }) {
  return (
    <View style={styles.trustPill}>
      <Text style={styles.trustEmoji}>{emoji}</Text>
      <Text style={styles.trustLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logo: { fontSize: 32, fontWeight: '700', color: PRIMARY, letterSpacing: -0.5 },
  logoBadge: {
    marginTop: 8,
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
  },
  logoBadgeText: { fontSize: 12, color: PRIMARY, fontWeight: '500' },
  heading: { fontSize: 26, fontWeight: '700', color: TEXT, marginBottom: 8 },
  subheading: { fontSize: 15, color: TEXT_SECONDARY, marginBottom: 32, lineHeight: 22 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    height: 56,
    overflow: 'hidden',
  },
  inputWrapperError: { borderColor: ERROR },
  countryCode: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 6 },
  flag: { fontSize: 20 },
  countryCodeText: { fontSize: 16, fontWeight: '600', color: TEXT },
  inputDivider: { width: 1, height: 28, backgroundColor: BORDER },
  input: { flex: 1, paddingHorizontal: 14, fontSize: 18, color: TEXT, fontWeight: '500', letterSpacing: 0.5 },
  errorContainer: {
    marginTop: 8,
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: ERROR,
  },
  errorText: { fontSize: 13, color: ERROR, lineHeight: 18 },
  helperText: { fontSize: 12, color: '#9E9E9E', marginTop: 8, marginBottom: 32 },
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
  },
  buttonDisabled: { backgroundColor: '#A5D6A7', shadowOpacity: 0, elevation: 0 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  terms: { marginTop: 20, textAlign: 'center', fontSize: 13, color: TEXT_SECONDARY, lineHeight: 20 },
  link: { color: PRIMARY, fontWeight: '600', textDecorationLine: 'underline' },
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 28, flexWrap: 'wrap' },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 4,
  },
  trustEmoji: { fontSize: 12, color: PRIMARY, fontWeight: '700' },
  trustLabel: { fontSize: 12, color: PRIMARY, fontWeight: '600' },
});
