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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import type { RootState } from '../../store';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const PRIMARY = '#1B5E20';
const SECONDARY = '#FF6F00';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const SURFACE = '#FFFFFF';
const BG = '#F5F7FA';
const ERROR = '#C62828';

// ─── Rating Categories ────────────────────────────────────────────────────────
interface RatingState {
  overall: number;
  communication: number;
  propertyCondition: number;
  maintenance: number;
  valueForMoney: number;
}

const RATING_CATEGORIES: Array<{ key: keyof RatingState; label: string }> = [
  { key: 'overall', label: 'Overall Experience' },
  { key: 'communication', label: 'Communication' },
  { key: 'propertyCondition', label: 'Property Condition' },
  { key: 'maintenance', label: 'Maintenance Responsiveness' },
  { key: 'valueForMoney', label: 'Value for Money' },
];

// ─── Star Row Component ───────────────────────────────────────────────────────
function StarRow({
  label,
  rating,
  required,
  onRate,
}: {
  label: string;
  rating: number;
  required?: boolean;
  onRate: (value: number) => void;
}) {
  return (
    <View style={styles.starRow}>
      <View style={styles.starLabelRow}>
        <Text style={styles.starLabel}>{label}</Text>
        {required && <Text style={styles.requiredDot}> *</Text>}
      </View>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onRate(star)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text style={[styles.star, star <= rating ? styles.starFilled : styles.starEmpty]}>
              {star <= rating ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
        {rating > 0 && (
          <Text style={styles.starScore}>{rating}/5</Text>
        )}
      </View>
    </View>
  );
}

function getErrorMessage(code: string): string {
  switch (code) {
    case 'functions/already-exists':
      return 'You have already submitted a review for this lease.';
    case 'functions/not-found':
      return 'Lease not found. Please try again.';
    case 'functions/failed-precondition':
      return 'Review cannot be submitted at this time.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CreateReviewScreen(): React.JSX.Element {
  const { leaseId, landlordId } = useLocalSearchParams<{
    leaseId: string;
    landlordId: string;
  }>();
  const uid = useSelector((state: RootState) => state.auth.uid);

  const [ratings, setRatings] = useState<RatingState>({
    overall: 0,
    communication: 0,
    propertyCondition: 0,
    maintenance: 0,
    valueForMoney: 0,
  });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [landlordName, setLandlordName] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [initialising, setInitialising] = useState(true);

  // ── On mount: check if already reviewed + load landlord name + load lease ──
  useEffect(() => {
    if (!leaseId || !landlordId || !uid) {
      setInitialising(false);
      return;
    }

    let cancelled = false;

    const init = async (): Promise<void> => {
      try {
        // Check for existing review
        const reviewSnap = await firestore()
          .collection('reviews')
          .where('leaseId', '==', leaseId)
          .where('reviewerId', '==', uid)
          .limit(1)
          .get();

        if (!cancelled && !reviewSnap.empty) {
          setAlreadyReviewed(true);
          setInitialising(false);
          return;
        }

        // Load landlord name
        const userSnap = await firestore().collection('users').doc(landlordId).get();
        const userData = userSnap.data() as
          | { firstName?: string; lastName?: string }
          | undefined;

        if (!cancelled && userData) {
          const name = [userData.firstName, userData.lastName].filter(Boolean).join(' ');
          setLandlordName(name || 'Landlord');
        }

        // Load lease to get propertyId
        const leaseSnap = await firestore().collection('leases').doc(leaseId).get();
        const leaseData = leaseSnap.data() as { propertyId?: string } | undefined;

        if (!cancelled && leaseData?.propertyId) {
          setPropertyId(leaseData.propertyId);
        }
      } catch {
        // Non-critical — proceed anyway
      } finally {
        if (!cancelled) setInitialising(false);
      }
    };

    void init();
    return () => {
      cancelled = true;
    };
  }, [leaseId, landlordId, uid]);

  const setRating = useCallback((key: keyof RatingState, value: number) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const isSubmitDisabled =
    submitting || ratings.overall < 1 || comment.trim().length < 10;

  const handleSubmit = useCallback(async () => {
    if (isSubmitDisabled) return;
    if (!leaseId || !landlordId) return;

    const trimmedComment = comment.trim();
    if (trimmedComment.length < 10) {
      Alert.alert('Comment Required', 'Please write at least 10 characters to share your experience.');
      return;
    }

    setSubmitting(true);
    try {
      await functions().httpsCallable('submitReview')({
        revieweeId: landlordId,
        propertyId,
        leaseId,
        rating: {
          overall: ratings.overall,
          communication: ratings.communication,
          propertyCondition: ratings.propertyCondition,
          maintenance: ratings.maintenance,
          valueForMoney: ratings.valueForMoney,
        },
        comment: trimmedComment,
      });

      Alert.alert(
        'Review Submitted',
        'Thank you for your review. It helps other tenants make informed decisions.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      Alert.alert('Submission Failed', getErrorMessage(code));
    } finally {
      setSubmitting(false);
    }
  }, [isSubmitDisabled, leaseId, landlordId, propertyId, ratings, comment]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (initialising) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  // ── Already reviewed ─────────────────────────────────────────────────────────
  if (alreadyReviewed) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Landlord</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.alreadyReviewedIcon}>✓</Text>
          <Text style={styles.alreadyReviewedTitle}>Already Reviewed</Text>
          <Text style={styles.alreadyReviewedBody}>
            You have already submitted a review for this rental.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.root} edges={['top']}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Landlord</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Who you're reviewing ── */}
          <View style={styles.revieweeCard}>
            <View style={styles.revieweeAvatar}>
              <Text style={styles.revieweeAvatarText}>
                {landlordName ? landlordName[0].toUpperCase() : 'L'}
              </Text>
            </View>
            <View style={styles.revieweeInfo}>
              <Text style={styles.revieweeName}>{landlordName || 'Landlord'}</Text>
              <Text style={styles.revieweeSubtitle}>Rate your experience</Text>
            </View>
          </View>

          {/* ── Ratings ── */}
          <View style={styles.ratingsCard}>
            <Text style={styles.sectionTitle}>Your Ratings</Text>
            <Text style={styles.sectionHint}>
              Fields marked <Text style={{ color: SECONDARY }}>*</Text> are required
            </Text>
            <View style={styles.cardDivider} />
            {RATING_CATEGORIES.map(({ key, label }, idx) => (
              <React.Fragment key={key}>
                <StarRow
                  label={label}
                  rating={ratings[key]}
                  required={key === 'overall'}
                  onRate={(val) => setRating(key, val)}
                />
                {idx < RATING_CATEGORIES.length - 1 && (
                  <View style={styles.starRowDivider} />
                )}
              </React.Fragment>
            ))}
          </View>

          {/* ── Comment ── */}
          <View style={styles.commentCard}>
            <Text style={styles.sectionTitle}>
              Your Experience <Text style={{ color: SECONDARY }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.commentInput,
                comment.length > 0 && comment.trim().length < 10
                  ? styles.commentInputError
                  : null,
              ]}
              placeholder="Share your experience with this landlord — what was great, what could be improved... (min 10 characters)"
              placeholderTextColor={TEXT_SECONDARY}
              multiline
              numberOfLines={5}
              value={comment}
              onChangeText={setComment}
              textAlignVertical="top"
              maxLength={500}
            />
            <View style={styles.charCountRow}>
              {comment.length > 0 && comment.trim().length < 10 ? (
                <Text style={styles.charCountError}>Minimum 10 characters required</Text>
              ) : (
                <Text style={styles.charCountHint}>Minimum 10 characters</Text>
              )}
              <Text
                style={[
                  styles.charCount,
                  comment.length > 450 ? styles.charCountWarning : null,
                ]}
              >
                {comment.length}/500
              </Text>
            </View>
          </View>

          {/* Spacer */}
          <View style={{ height: 16 }} />
        </ScrollView>

        {/* ── Submit Footer ── */}
        <View style={styles.footer}>
          {ratings.overall === 0 && (
            <Text style={styles.footerHint}>Please rate your overall experience to continue</Text>
          )}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitDisabled && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitDisabled}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={SURFACE} />
            ) : (
              <Text style={styles.submitBtnText}>Submit Review</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: BG,
  },
  loadingText: {
    marginTop: 12,
    color: TEXT_SECONDARY,
    fontSize: 14,
  },
  alreadyReviewedIcon: {
    fontSize: 56,
    color: PRIMARY,
    marginBottom: 12,
  },
  alreadyReviewedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 8,
    textAlign: 'center',
  },
  alreadyReviewedBody: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 13,
  },
  primaryBtnText: {
    color: SURFACE,
    fontWeight: '700',
    fontSize: 15,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    minWidth: 60,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: PRIMARY,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_COLOR,
  },
  headerSpacer: {
    minWidth: 60,
  },
  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  // Reviewee card
  revieweeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  revieweeAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  revieweeAvatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: SURFACE,
  },
  revieweeInfo: {
    flex: 1,
  },
  revieweeName: {
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 3,
  },
  revieweeSubtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
  },
  // Ratings card
  ratingsCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginBottom: 8,
  },
  cardDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginBottom: 12,
  },
  // Star row
  starRow: {
    paddingVertical: 10,
  },
  starLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_COLOR,
  },
  requiredDot: {
    fontSize: 14,
    color: SECONDARY,
    fontWeight: '700',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  star: {
    fontSize: 32,
    lineHeight: 36,
  },
  starFilled: {
    color: '#FFA000',
  },
  starEmpty: {
    color: '#BDBDBD',
  },
  starScore: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontWeight: '600',
    marginLeft: 6,
  },
  starRowDivider: {
    height: 1,
    backgroundColor: '#F5F5F5',
  },
  // Comment
  commentCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: TEXT_COLOR,
    minHeight: 120,
    marginTop: 10,
  },
  commentInputError: {
    borderColor: ERROR,
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
  charCountError: {
    fontSize: 12,
    color: ERROR,
    flex: 1,
  },
  charCount: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  charCountWarning: {
    color: SECONDARY,
    fontWeight: '600',
  },
  // Footer
  footer: {
    backgroundColor: SURFACE,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  footerHint: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 8,
  },
  submitBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: SURFACE,
  },
});
