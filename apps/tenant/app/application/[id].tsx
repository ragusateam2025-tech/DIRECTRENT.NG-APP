import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSelector } from 'react-redux';
import functions from '@react-native-firebase/functions';
import { RootState } from '../../store';
import { PropertyService } from '../../../../packages/shared/src/services/property.service';
import { formatCurrency } from '../../../../packages/shared/src/utils/currency';
import type { Property } from '../../../../packages/shared/src/types/property';
import type { LeaseDuration } from '../../../../packages/shared/src/types/application';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const SECONDARY = '#FF6F00';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const SURFACE = '#FFFFFF';
const BG = '#F5F7FA';

// ─── Types ────────────────────────────────────────────────────────────────────
type EmploymentStatus = 'employed' | 'self_employed' | 'student' | 'other';
type IncomeRange = 'below_200k' | '200k_500k' | '500k_1m' | 'above_1m';

const INCOME_LABELS: Record<IncomeRange, string> = {
  below_200k: 'Below ₦200K',
  '200k_500k': '₦200K–₦500K',
  '500k_1m': '₦500K–₦1M',
  above_1m: 'Above ₦1M',
};

const EMPLOYMENT_LABELS: Record<EmploymentStatus, string> = {
  employed: 'Employed',
  self_employed: 'Self-Employed',
  student: 'Student',
  other: 'Other',
};

const LEASE_LABELS: Record<LeaseDuration, string> = {
  '1_year': '1 Year',
  '2_years': '2 Years',
  '3_years': '3 Years',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function addMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function parseDDMMYYYY(value: string): Date | null {
  const parts = value.split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy || yyyy < 2020) return null;
  const d = new Date(yyyy, mm - 1, dd);
  if (isNaN(d.getTime())) return null;
  return d;
}

function getErrorMessage(code: string): string {
  switch (code) {
    case 'functions/already-exists':
      return "You've already applied for this property.";
    case 'functions/not-found':
      return 'Property not found. It may have been removed.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

// ─── Step Progress Bar ────────────────────────────────────────────────────────
function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.stepBarContainer}>
      {Array.from({ length: total }, (_, i) => (
        <React.Fragment key={i}>
          <View
            style={[
              styles.stepDot,
              i + 1 <= current ? styles.stepDotActive : styles.stepDotInactive,
            ]}
          >
            <Text
              style={[
                styles.stepDotText,
                i + 1 <= current ? styles.stepDotTextActive : styles.stepDotTextInactive,
              ]}
            >
              {i + 1}
            </Text>
          </View>
          {i < total - 1 && (
            <View
              style={[
                styles.stepLine,
                i + 1 < current ? styles.stepLineActive : styles.stepLineInactive,
              ]}
            />
          )}
        </React.Fragment>
      ))}
      <Text style={styles.stepLabel}>
        Step {current} of {total}
      </Text>
    </View>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────
function Chip<T extends string>({
  label,
  value,
  selected,
  onPress,
}: {
  label: string;
  value: T;
  selected: boolean;
  onPress: (v: T) => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={() => onPress(value)}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Stepper ─────────────────────────────────────────────────────────────────
function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          style={[styles.stepperBtn, value <= min && styles.stepperBtnDisabled]}
          onPress={() => value > min && onChange(value - 1)}
        >
          <Text style={styles.stepperBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{value}</Text>
        <TouchableOpacity
          style={[styles.stepperBtn, value >= max && styles.stepperBtnDisabled]}
          onPress={() => value < max && onChange(value + 1)}
        >
          <Text style={styles.stepperBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ApplicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useSelector((state: RootState) => state.auth.profile);

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);

  // Property info
  const [property, setProperty] = useState<Property | null>(null);
  const [propertyLoading, setPropertyLoading] = useState(true);

  // Step 1 state
  const [moveInQuick, setMoveInQuick] = useState<string>(''); // '' | 'asap' | '1m' | '2m' | '3m'
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  );
  const [customDateText, setCustomDateText] = useState('');
  const [customDateError, setCustomDateError] = useState('');
  const [leaseDuration, setLeaseDuration] = useState<LeaseDuration>('1_year');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [hasPets, setHasPets] = useState(false);
  const [petType, setPetType] = useState('');

  // Step 2 state
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>('employed');
  const [employer, setEmployer] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [incomeRange, setIncomeRange] = useState<IncomeRange>('200k_500k');

  // Step 3 state
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState('');

  // Check verification gate on mount
  useEffect(() => {
    const bvnVerified = profile?.verification?.bvn?.status === 'verified';
    const ninVerified = profile?.verification?.nin?.status === 'verified';
    if (!bvnVerified && !ninVerified) {
      setVerificationModalVisible(true);
    }
  }, [profile]);

  // Load property details
  useEffect(() => {
    if (!id) return;
    setPropertyLoading(true);
    PropertyService.getProperty(id)
      .then(p => setProperty(p))
      .catch(() => setProperty(null))
      .finally(() => setPropertyLoading(false));
  }, [id]);

  const handleQuickDate = useCallback((key: string, isoDate: string) => {
    setMoveInQuick(key);
    setSelectedDate(isoDate);
    setCustomDateText('');
    setCustomDateError('');
  }, []);

  const handleCustomDateChange = useCallback((text: string) => {
    setCustomDateText(text);
    setCustomDateError('');
    setMoveInQuick('custom');
    if (text.length === 10) {
      const parsed = parseDDMMYYYY(text);
      if (!parsed || parsed < new Date()) {
        setCustomDateError('Enter a valid future date (DD/MM/YYYY)');
      } else {
        setSelectedDate(parsed.toISOString());
      }
    }
  }, []);

  const validateStep1 = useCallback((): boolean => {
    if (moveInQuick === 'custom' && customDateError) return false;
    if (moveInQuick === 'custom' && customDateText.length < 10) {
      setCustomDateError('Enter a valid future date (DD/MM/YYYY)');
      return false;
    }
    return true;
  }, [moveInQuick, customDateError, customDateText]);

  const validateStep3 = useCallback((): boolean => {
    if (message.trim().length < 20) {
      setMessageError('Message must be at least 20 characters.');
      return false;
    }
    setMessageError('');
    return true;
  }, [message]);

  const handleNext = useCallback(() => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep < 3) setCurrentStep(s => s + 1);
  }, [currentStep, validateStep1]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    if (!validateStep3()) return;
    if (!id) return;

    setSubmitting(true);
    try {
      const submitApplication = functions().httpsCallable('submitApplication');
      await submitApplication({
        propertyId: id,
        details: {
          preferredMoveIn: selectedDate,
          leaseDuration,
          occupants: {
            adults,
            children,
            pets: { hasPets, petType: hasPets ? petType : undefined },
          },
          employmentInfo: {
            status: employmentStatus,
            employer:
              employmentStatus === 'employed' || employmentStatus === 'self_employed'
                ? employer
                : null,
            role:
              employmentStatus === 'employed' || employmentStatus === 'self_employed'
                ? jobRole
                : null,
            monthlyIncome: incomeRange,
          },
          message: message.trim(),
        },
      });

      Alert.alert(
        'Application Submitted!',
        'Your application has been sent to the landlord. You will be notified when they respond.',
        [
          {
            text: 'View My Applications',
            onPress: () => router.replace('/my-applications'),
          },
        ]
      );
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      Alert.alert('Submission Failed', getErrorMessage(code));
    } finally {
      setSubmitting(false);
    }
  }, [
    validateStep3,
    id,
    selectedDate,
    leaseDuration,
    adults,
    children,
    hasPets,
    petType,
    employmentStatus,
    employer,
    jobRole,
    incomeRange,
    message,
  ]);

  // ── Verification Modal ────────────────────────────────────────────────────
  const renderVerificationModal = () => (
    <Modal
      visible={verificationModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setVerificationModalVisible(false);
        router.back();
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Identity Verification Required</Text>
          <Text style={styles.modalBody}>
            You must verify your BVN or NIN before submitting a rental application. This
            protects both you and the landlord.
          </Text>
          <TouchableOpacity
            style={styles.modalPrimaryBtn}
            onPress={() => {
              setVerificationModalVisible(false);
              router.push('/(verification)/bvn');
            }}
          >
            <Text style={styles.modalPrimaryBtnText}>Verify BVN / NIN</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalSecondaryBtn}
            onPress={() => {
              setVerificationModalVisible(false);
              router.back();
            }}
          >
            <Text style={styles.modalSecondaryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // ── Step 1 ────────────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.sectionTitle}>Move-in Date</Text>
      <View style={styles.chipRow}>
        {([
          { key: 'asap', label: 'ASAP', iso: new Date().toISOString() },
          { key: '1m', label: '1 Month', iso: addMonths(1) },
          { key: '2m', label: '2 Months', iso: addMonths(2) },
          { key: '3m', label: '3 Months', iso: addMonths(3) },
        ] as const).map(item => (
          <Chip<string>
            key={item.key}
            label={item.label}
            value={item.key}
            selected={moveInQuick === item.key}
            onPress={() => handleQuickDate(item.key, item.iso)}
          />
        ))}
      </View>
      <TextInput
        style={[styles.input, customDateError ? styles.inputError : null]}
        placeholder="Custom date (DD/MM/YYYY)"
        placeholderTextColor={TEXT_SECONDARY}
        value={customDateText}
        onChangeText={handleCustomDateChange}
        keyboardType="numeric"
        maxLength={10}
      />
      {customDateError ? (
        <Text style={styles.errorText}>{customDateError}</Text>
      ) : null}
      {selectedDate ? (
        <Text style={styles.selectedDateText}>
          Selected: {formatDisplayDate(selectedDate)}
        </Text>
      ) : null}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Lease Duration</Text>
      <View style={styles.chipRow}>
        {(['1_year', '2_years', '3_years'] as LeaseDuration[]).map(d => (
          <Chip<LeaseDuration>
            key={d}
            label={LEASE_LABELS[d]}
            value={d}
            selected={leaseDuration === d}
            onPress={setLeaseDuration}
          />
        ))}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Occupants</Text>
      <View style={styles.card}>
        <Stepper
          label="Adults"
          value={adults}
          min={1}
          max={10}
          onChange={setAdults}
        />
        <View style={styles.divider} />
        <Stepper
          label="Children"
          value={children}
          min={0}
          max={10}
          onChange={setChildren}
        />
        <View style={styles.divider} />
        <View style={styles.stepperRow}>
          <Text style={styles.stepperLabel}>Pets</Text>
          <Switch
            value={hasPets}
            onValueChange={setHasPets}
            thumbColor={hasPets ? PRIMARY : BORDER}
            trackColor={{ false: BORDER, true: PRIMARY_LIGHT }}
          />
        </View>
        {hasPets && (
          <TextInput
            style={[styles.input, { marginTop: 12 }]}
            placeholder="Type of pet(s) e.g. Dog, Cat"
            placeholderTextColor={TEXT_SECONDARY}
            value={petType}
            onChangeText={setPetType}
          />
        )}
      </View>
    </View>
  );

  // ── Step 2 ────────────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.sectionTitle}>Employment Status</Text>
      <View style={styles.chipRow}>
        {(['employed', 'self_employed', 'student', 'other'] as EmploymentStatus[]).map(
          s => (
            <Chip<EmploymentStatus>
              key={s}
              label={EMPLOYMENT_LABELS[s]}
              value={s}
              selected={employmentStatus === s}
              onPress={setEmploymentStatus}
            />
          )
        )}
      </View>

      {(employmentStatus === 'employed' || employmentStatus === 'self_employed') && (
        <View style={{ marginTop: 20 }}>
          <Text style={styles.inputLabel}>
            {employmentStatus === 'employed' ? 'Employer Name' : 'Business Name'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={
              employmentStatus === 'employed'
                ? 'e.g. Access Bank Plc'
                : 'e.g. Adeyemi Ventures'
            }
            placeholderTextColor={TEXT_SECONDARY}
            value={employer}
            onChangeText={setEmployer}
          />
          <Text style={[styles.inputLabel, { marginTop: 16 }]}>
            {employmentStatus === 'employed' ? 'Role / Position' : 'Your Role'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Software Engineer"
            placeholderTextColor={TEXT_SECONDARY}
            value={jobRole}
            onChangeText={setJobRole}
          />
        </View>
      )}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Monthly Income Range</Text>
      <View style={styles.chipRow}>
        {(
          ['below_200k', '200k_500k', '500k_1m', 'above_1m'] as IncomeRange[]
        ).map(r => (
          <Chip<IncomeRange>
            key={r}
            label={INCOME_LABELS[r]}
            value={r}
            selected={incomeRange === r}
            onPress={setIncomeRange}
          />
        ))}
      </View>
    </View>
  );

  // ── Step 3 ────────────────────────────────────────────────────────────────
  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.sectionTitle}>Message to Landlord</Text>
      <TextInput
        style={[styles.messageInput, messageError ? styles.inputError : null]}
        placeholder="Introduce yourself and tell the landlord why you're a great tenant... (min 20 characters)"
        placeholderTextColor={TEXT_SECONDARY}
        multiline
        numberOfLines={5}
        value={message}
        onChangeText={text => {
          setMessage(text);
          if (messageError && text.trim().length >= 20) setMessageError('');
        }}
        textAlignVertical="top"
        maxLength={1000}
      />
      <View style={styles.charCountRow}>
        {messageError ? (
          <Text style={styles.errorText}>{messageError}</Text>
        ) : (
          <Text style={styles.charCountHint}>Minimum 20 characters</Text>
        )}
        <Text style={styles.charCount}>{message.length}/1000</Text>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Application Summary</Text>
      <View style={styles.summaryCard}>
        {propertyLoading ? (
          <ActivityIndicator color={PRIMARY} />
        ) : property ? (
          <>
            <Text style={styles.summaryPropertyTitle} numberOfLines={2}>
              {property.title}
            </Text>
            <Text style={styles.summaryPropertySub}>
              {property.location.area} · {formatCurrency(property.pricing.annualRent)}/year
            </Text>
          </>
        ) : (
          <Text style={styles.summaryPropertySub}>Property details unavailable</Text>
        )}
        <View style={styles.summaryDivider} />
        <SummaryRow
          label="Move-in Date"
          value={selectedDate ? formatDisplayDate(selectedDate) : '—'}
        />
        <SummaryRow label="Lease Duration" value={LEASE_LABELS[leaseDuration]} />
        <SummaryRow
          label="Occupants"
          value={`${adults} adult${adults !== 1 ? 's' : ''}${
            children > 0 ? `, ${children} child${children !== 1 ? 'ren' : ''}` : ''
          }${hasPets ? ` · Pets: ${petType || 'Yes'}` : ''}`}
        />
        <SummaryRow label="Employment" value={EMPLOYMENT_LABELS[employmentStatus]} />
        <SummaryRow label="Monthly Income" value={INCOME_LABELS[incomeRange]} />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={currentStep > 1 ? handleBack : () => router.back()}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rental Application</Text>
          <View style={{ width: 60 }} />
        </View>

        <StepBar current={currentStep} total={3} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </ScrollView>

        {/* Footer CTA */}
        <View style={styles.footer}>
          {currentStep < 3 ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
              <Text style={styles.primaryBtnText}>Continue →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={SURFACE} />
              ) : (
                <Text style={styles.primaryBtnText}>Submit Application</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {renderVerificationModal()}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Summary Row ──────────────────────────────────────────────────────────────
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SURFACE,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    fontSize: 15,
    color: PRIMARY,
    fontWeight: '600',
    width: 60,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_COLOR,
  },
  // Step bar
  stepBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    flexWrap: 'wrap',
    gap: 0,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: PRIMARY,
  },
  stepDotInactive: {
    backgroundColor: BORDER,
  },
  stepDotText: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepDotTextActive: {
    color: SURFACE,
  },
  stepDotTextInactive: {
    color: TEXT_SECONDARY,
  },
  stepLine: {
    flex: 1,
    height: 3,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: PRIMARY,
  },
  stepLineInactive: {
    backgroundColor: BORDER,
  },
  stepLabel: {
    position: 'absolute',
    right: 16,
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  stepContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 12,
  },
  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  chipSelected: {
    backgroundColor: PRIMARY_LIGHT,
    borderColor: PRIMARY,
  },
  chipText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: PRIMARY,
    fontWeight: '700',
  },
  // Input
  input: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT_COLOR,
    marginTop: 4,
  },
  inputError: {
    borderColor: '#C62828',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#C62828',
    marginTop: 4,
    flex: 1,
  },
  selectedDateText: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: '600',
    marginTop: 8,
  },
  // Card
  card: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 12,
  },
  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperLabel: {
    fontSize: 15,
    color: TEXT_COLOR,
    fontWeight: '500',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    backgroundColor: BORDER,
  },
  stepperBtnText: {
    fontSize: 20,
    color: PRIMARY,
    fontWeight: '700',
    lineHeight: 22,
  },
  stepperValue: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_COLOR,
    minWidth: 24,
    textAlign: 'center',
  },
  // Message input
  messageInput: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: TEXT_COLOR,
    minHeight: 120,
  },
  charCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  charCountHint: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    flex: 1,
  },
  charCount: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  // Summary card
  summaryCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  summaryPropertyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 4,
  },
  summaryPropertySub: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    flex: 1,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_COLOR,
    flex: 2,
    textAlign: 'right',
  },
  // Footer
  footer: {
    backgroundColor: SURFACE,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  primaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: SURFACE,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 24,
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 22,
    marginBottom: 24,
  },
  modalPrimaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: SURFACE,
  },
  modalSecondaryBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  modalSecondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
});
