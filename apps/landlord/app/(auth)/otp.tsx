import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthService } from '../../services/auth.service';

const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const ERROR = '#D32F2F';
const TEXT = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 300;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function maskPhone(phone: string): string {
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 7)}***${phone.slice(-4)}`;
}

export default function OTPScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [expirySeconds, setExpirySeconds] = useState(OTP_EXPIRY_SECONDS);
  const [resendSeconds, setResendSeconds] = useState(RESEND_COOLDOWN_SECONDS);
  const [resendLoading, setResendLoading] = useState(false);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setExpirySeconds((s) => {
        if (s <= 1) {
          clearInterval(interval);
          setError('Your code has expired. Please request a new one.');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const interval = setInterval(() => {
      setResendSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendSeconds]);

  useEffect(() => {
    if (otp.length === OTP_LENGTH) {
      Keyboard.dismiss();
      handleVerify(otp);
    }
  }, [otp]);

  const handleOtpChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH);
    setOtp(cleaned);
    if (error) setError(null);
  };

  const handleVerify = useCallback(
    async (code: string) => {
      if (loading || code.length !== OTP_LENGTH) return;
      if (attemptsLeft <= 0) {
        setError('Too many incorrect attempts. Please request a new code.');
        return;
      }
      if (expirySeconds <= 0) {
        setError('Your code has expired. Please request a new one.');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await AuthService.verifyOTP(code);
        // Auth state listener in _layout.tsx handles navigation
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid code. Please try again.';
        const remaining = attemptsLeft - 1;
        setAttemptsLeft(remaining);
        setOtp('');

        if (remaining <= 0) {
          setError('Too many incorrect attempts. Please go back and request a new code.');
        } else if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('wrong')) {
          setError(`Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`);
        } else {
          setError(message);
        }

        setTimeout(() => inputRef.current?.focus(), 100);
      } finally {
        setLoading(false);
      }
    },
    [loading, attemptsLeft, expirySeconds]
  );

  const handleResend = async () => {
    if (resendSeconds > 0 || resendLoading || !phone) return;

    setResendLoading(true);
    setError(null);
    setOtp('');

    try {
      await AuthService.sendOTP(phone);
      setExpirySeconds(OTP_EXPIRY_SECONDS);
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setAttemptsLeft(MAX_ATTEMPTS);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend code.';
      setError(message);
    } finally {
      setResendLoading(false);
    }
  };

  const canResend = resendSeconds <= 0 && !resendLoading;
  const isExpired = expirySeconds <= 0;
  const tooManyAttempts = attemptsLeft <= 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Verify your number</Text>
        <Text style={styles.subheading}>
          Enter the 6-digit code sent to{'\n'}
          <Text style={styles.phoneDisplay}>{maskPhone(phone ?? '')}</Text>
        </Text>

        <TouchableOpacity
          style={styles.otpTouchable}
          activeOpacity={1}
          onPress={() => inputRef.current?.focus()}
        >
          <View style={styles.boxesRow}>
            {Array.from({ length: OTP_LENGTH }).map((_, i) => {
              const isActive = otp.length === i && !isExpired && !tooManyAttempts;
              const isFilled = otp.length > i;
              return (
                <View
                  key={i}
                  style={[
                    styles.box,
                    isActive && styles.boxActive,
                    isFilled && styles.boxFilled,
                    !!error && isFilled && styles.boxError,
                  ]}
                >
                  <Text style={styles.boxText}>{otp[i] ?? ''}</Text>
                </View>
              );
            })}
          </View>

          <TextInput
            ref={inputRef}
            value={otp}
            onChangeText={handleOtpChange}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            style={styles.hiddenInput}
            autoFocus
            editable={!loading && !isExpired && !tooManyAttempts}
            caretHidden
          />
        </TouchableOpacity>

        {!isExpired && !tooManyAttempts && (
          <Text style={styles.countdown}>
            Code expires in{' '}
            <Text style={[styles.countdownValue, expirySeconds < 60 && styles.countdownUrgent]}>
              {formatCountdown(expirySeconds)}
            </Text>
          </Text>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={PRIMARY} size="small" />
            <Text style={styles.loadingText}>Verifying...</Text>
          </View>
        )}

        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't receive a code? </Text>
          {canResend ? (
            <TouchableOpacity onPress={handleResend} disabled={resendLoading}>
              {resendLoading ? (
                <ActivityIndicator color={PRIMARY} size="small" />
              ) : (
                <Text style={styles.resendLink}>Resend code</Text>
              )}
            </TouchableOpacity>
          ) : (
            <Text style={styles.resendCooldown}>Resend in {resendSeconds}s</Text>
          )}
        </View>

        <View style={styles.securityNote}>
          <Text style={styles.securityNoteText}>
            🔒 We never share your number. It's only used for account security.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24, marginLeft: -8 },
  backIcon: { fontSize: 22, color: TEXT, fontWeight: '600' },
  heading: { fontSize: 26, fontWeight: '700', color: TEXT, marginBottom: 10 },
  subheading: { fontSize: 15, color: TEXT_SECONDARY, lineHeight: 22, marginBottom: 40 },
  phoneDisplay: { color: TEXT, fontWeight: '600' },
  otpTouchable: { alignItems: 'center', marginBottom: 20 },
  boxesRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  box: {
    width: 48, height: 56, borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA',
  },
  boxActive: { borderColor: PRIMARY, borderWidth: 2, backgroundColor: PRIMARY_LIGHT },
  boxFilled: { borderColor: PRIMARY, backgroundColor: '#fff' },
  boxError: { borderColor: ERROR },
  boxText: { fontSize: 22, fontWeight: '700', color: TEXT },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  countdown: { textAlign: 'center', fontSize: 13, color: TEXT_SECONDARY, marginBottom: 16 },
  countdownValue: { fontWeight: '700', color: TEXT },
  countdownUrgent: { color: '#E65100' },
  errorContainer: {
    backgroundColor: '#FFEBEE', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 8, borderLeftWidth: 3, borderLeftColor: ERROR, marginBottom: 16,
  },
  errorText: { fontSize: 13, color: ERROR, lineHeight: 18 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  loadingText: { fontSize: 14, color: TEXT_SECONDARY },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8, marginBottom: 40 },
  resendLabel: { fontSize: 14, color: TEXT_SECONDARY },
  resendLink: { fontSize: 14, color: PRIMARY, fontWeight: '700', textDecorationLine: 'underline' },
  resendCooldown: { fontSize: 14, color: '#9E9E9E', fontWeight: '500' },
  securityNote: { backgroundColor: PRIMARY_LIGHT, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, marginTop: 'auto', marginBottom: 8 },
  securityNoteText: { fontSize: 13, color: PRIMARY, lineHeight: 18, textAlign: 'center' },
});
