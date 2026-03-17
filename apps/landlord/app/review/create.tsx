import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import type { RootState } from '../../store';

// ─── Design tokens ─────────────────────────────────────────────────────────
const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const SECONDARY = '#FF6F00';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const SURFACE = '#FFFFFF';
const BG = '#F5F7FA';
const SUCCESS = '#2E7D32';
const ERROR = '#C62828';

// ─── Types ──────────────────────────────────────────────────────────────────
interface RatingCategories {
  overall: number;
  communication: number;
  propertyUpkeep: number;
  paymentTimeliness: number;
}

// ─── Star row component ─────────────────────────────────────────────────────
interface StarRowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  required?: boolean;
}

function StarRow({ label, value, onChange, required = false }: StarRowProps) {
  return (
    <View style={styles.starRow}>
      <View style={styles.starLabelWrap}>
        <Text style={styles.starLabel}>{label}</Text>
        {required && <Text style={styles.starRequired}> *</Text>}
      </View>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onChange(star)}
            activeOpacity={0.7}
            style={styles.starBtn}
          >
            <Text style={[styles.starIcon, star <= value && styles.starIconFilled]}>
              {star <= value ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
        {value > 0 && (
          <Text style={styles.starValueLabel}>{value}/5</Text>
        )}
      </View>
    </View>
  );
}

// ─── Already reviewed state ─────────────────────────────────────────────────
function AlreadyReviewedState({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.alreadyReviewed}>
      <Text style={styles.alreadyReviewedIcon}>✓</Text>
      <Text style={styles.alreadyReviewedTitle}>Already Reviewed</Text>
      <Text style={styles.alreadyReviewedMsg}>
        You have already submitted a review for this tenant on this lease.
      </Text>
      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
        <Text style={styles.backBtnText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main screen ────────────────────────────────────────────────────────────
export default function CreateReviewScreen() {
  const { leaseId, tenantId } = useLocalSearchParams<{
    leaseId: string;
    tenantId: string;
  }>();
  const router = useRouter();
  const uid = useSelector((state: RootState) => state.auth.uid);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [propertyId, setPropertyId] = useState('');

  const [ratings, setRatings] = useState<RatingCategories>({
    overall: 0,
    communication: 0,
    propertyUpkeep: 0,
    paymentTimeliness: 0,
  });
  const [comment, setComment] = useState('');

  const loadInitialData = useCallback(async () => {
    if (!uid || !leaseId || !tenantId) return;

    try {
      // 1. Check for existing review
      const existingReview = await firestore()
        .collection('reviews')
        .where('leaseId', '==', leaseId)
        .where('reviewerId', '==', uid)
        .limit(1)
        .get();

      if (!existingReview.empty) {
        setAlreadyReviewed(true);
        setLoading(false);
        return;
      }

      // 2. Fetch tenant name
      const userDoc = await firestore().collection('users').doc(tenantId).get();
      const userData = userDoc.data() as
        | { firstName?: string; lastName?: string }
        | undefined;
      if (userData) {
        const name =
          `${userData.firstName ?? ''} ${userData.lastName ?? ''}`.trim();
        setTenantName(name || 'Tenant');
      } else {
        setTenantName('Tenant');
      }

      // 3. Fetch propertyId from lease
      const leaseDoc = await firestore().collection('leases').doc(leaseId).get();
      const leaseData = leaseDoc.data() as { propertyId?: string } | undefined;
      setPropertyId(leaseData?.propertyId ?? '');
    } catch {
      Alert.alert('Error', 'Failed to load review data. Please try again.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [uid, leaseId, tenantId, router]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  const handleRatingChange = useCallback(
    (category: keyof RatingCategories, value: number) => {
      setRatings((prev) => ({ ...prev, [category]: value }));
    },
    []
  );

  const isSubmitDisabled =
    submitting ||
    ratings.overall < 1 ||
    comment.trim().length < 10;

  const handleSubmit = useCallback(async () => {
    if (!uid || !leaseId || !tenantId || !propertyId) return;

    if (ratings.overall < 1) {
      Alert.alert('Overall Rating Required', 'Please select an overall rating before submitting.');
      return;
    }
    if (comment.trim().length < 10) {
      Alert.alert('Comment Too Short', 'Your comment must be at least 10 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const submitReview = functions().httpsCallable('submitReview');
      await submitReview({
        revieweeId: tenantId,
        propertyId,
        leaseId,
        rating: {
          overall: ratings.overall,
          communication: ratings.communication > 0 ? ratings.communication : undefined,
          propertyUpkeep: ratings.propertyUpkeep > 0 ? ratings.propertyUpkeep : undefined,
          paymentTimeliness: ratings.paymentTimeliness > 0 ? ratings.paymentTimeliness : undefined,
        },
        comment: comment.trim(),
      });

      Alert.alert(
        'Review Submitted',
        'Thank you! Your review has been submitted successfully.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to submit review. Please try again.';
      Alert.alert('Submission Failed', message);
    } finally {
      setSubmitting(false);
    }
  }, [uid, leaseId, tenantId, propertyId, ratings, comment, router]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (alreadyReviewed) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
            <Text style={styles.headerBackText}>← Review Tenant</Text>
          </TouchableOpacity>
        </View>
        <AlreadyReviewedState onBack={() => router.back()} />
      </View>
    );
  }

  const commentLength = comment.length;
  const commentTooShort = commentLength > 0 && commentLength < 10;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
          <Text style={styles.headerBackText}>← Review Tenant</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Who you're reviewing */}
          <View style={styles.tenantCard}>
            <View style={styles.tenantAvatar}>
              <Text style={styles.tenantAvatarInitial}>
                {tenantName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.tenantInfo}>
              <Text style={styles.tenantName}>{tenantName}</Text>
              <Text style={styles.tenantSubtitle}>Rate your tenant</Text>
            </View>
          </View>

          {/* Rating categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ratings</Text>
            <Text style={styles.sectionHint}>
              Overall rating is required. Other categories are optional but helpful.
            </Text>

            <StarRow
              label="Overall Experience"
              value={ratings.overall}
              onChange={(v) => handleRatingChange('overall', v)}
              required
            />
            <View style={styles.divider} />
            <StarRow
              label="Communication"
              value={ratings.communication}
              onChange={(v) => handleRatingChange('communication', v)}
            />
            <View style={styles.divider} />
            <StarRow
              label="Property Upkeep / Care"
              value={ratings.propertyUpkeep}
              onChange={(v) => handleRatingChange('propertyUpkeep', v)}
            />
            <View style={styles.divider} />
            <StarRow
              label="Payment Timeliness"
              value={ratings.paymentTimeliness}
              onChange={(v) => handleRatingChange('paymentTimeliness', v)}
            />
          </View>

          {/* Overall rating indicator */}
          {ratings.overall > 0 && (
            <View style={[styles.overallBanner, { borderColor: ratingColor(ratings.overall) }]}>
              <Text style={[styles.overallBannerText, { color: ratingColor(ratings.overall) }]}>
                {ratingLabel(ratings.overall)}
              </Text>
            </View>
          )}

          {/* Comment */}
          <View style={styles.section}>
            <View style={styles.commentHeader}>
              <Text style={styles.sectionTitle}>Your Review</Text>
              <Text
                style={[
                  styles.charCounter,
                  commentLength > 500 && styles.charCounterOver,
                ]}
              >
                {commentLength}/500
              </Text>
            </View>
            <TextInput
              style={[
                styles.commentInput,
                commentTooShort && styles.commentInputError,
              ]}
              value={comment}
              onChangeText={(text) => {
                if (text.length <= 500) setComment(text);
              }}
              placeholder="Share your experience with this tenant. How was living together? Were they respectful of the property? (min. 10 characters)"
              placeholderTextColor={TEXT_SECONDARY}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            {commentTooShort && (
              <Text style={styles.commentErrorText}>
                Minimum 10 characters required.
              </Text>
            )}
            {commentLength === 500 && (
              <Text style={styles.commentErrorText}>
                Maximum 500 characters reached.
              </Text>
            )}
          </View>

          {/* Disclaimer */}
          <Text style={styles.disclaimer}>
            Your review will be visible to tenants and other landlords. Please be honest
            and fair. Reviews cannot be edited after submission.
          </Text>

          {/* Submit button */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitDisabled && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitDisabled}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Review</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ratingColor(rating: number): string {
  if (rating >= 4) return SUCCESS;
  if (rating === 3) return SECONDARY;
  return ERROR;
}

function ratingLabel(rating: number): string {
  switch (rating) {
    case 1: return 'Poor';
    case 2: return 'Below Average';
    case 3: return 'Average';
    case 4: return 'Good';
    case 5: return 'Excellent';
    default: return '';
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: TEXT_SECONDARY },

  header: {
    backgroundColor: SURFACE,
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerBack: { flexDirection: 'row', alignItems: 'center' },
  headerBackText: { fontSize: 17, fontWeight: '600', color: PRIMARY },

  scrollContent: { padding: 16 },

  tenantCard: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  tenantAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  tenantAvatarInitial: { fontSize: 22, fontWeight: '700', color: PRIMARY },
  tenantInfo: { flex: 1 },
  tenantName: { fontSize: 17, fontWeight: '700', color: TEXT_COLOR, marginBottom: 3 },
  tenantSubtitle: { fontSize: 13, color: TEXT_SECONDARY },

  section: {
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
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
    marginBottom: 14,
    lineHeight: 18,
  },

  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 12,
  },

  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  starLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  starLabel: { fontSize: 14, color: TEXT_COLOR, fontWeight: '500', flexShrink: 1 },
  starRequired: { fontSize: 14, color: ERROR, fontWeight: '700' },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starBtn: { padding: 4 },
  starIcon: { fontSize: 24, color: BORDER },
  starIconFilled: { color: SECONDARY },
  starValueLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginLeft: 6,
    fontWeight: '600',
    minWidth: 24,
  },

  overallBanner: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: SURFACE,
  },
  overallBannerText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  charCounter: { fontSize: 12, color: TEXT_SECONDARY, fontWeight: '500' },
  charCounterOver: { color: ERROR },

  commentInput: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: TEXT_COLOR,
    minHeight: 120,
    lineHeight: 21,
  },
  commentInputError: { borderColor: ERROR },
  commentErrorText: { fontSize: 12, color: ERROR, marginTop: 6 },

  disclaimer: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 4,
  },

  submitBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: PRIMARY,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  submitBtnDisabled: {
    backgroundColor: '#A5D6A7',
    elevation: 0,
    shadowOpacity: 0,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  // Already reviewed state
  alreadyReviewed: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  alreadyReviewedIcon: {
    fontSize: 56,
    color: SUCCESS,
    marginBottom: 16,
  },
  alreadyReviewedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 10,
    textAlign: 'center',
  },
  alreadyReviewedMsg: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  backBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  backBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
