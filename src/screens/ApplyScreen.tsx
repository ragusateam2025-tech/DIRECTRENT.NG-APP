import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { duration, easing, stagger } from '../theme/motion';
import Button from '../components/Button';
import TextField from '../components/TextField';
import { formatNaira } from '../lib/format';
import { calculateSavings } from '../lib/savings';
import {
  submitApplication,
  MOVE_IN_LABELS,
  LEASE_LABELS,
} from '../services/applications';
import { ensureConversation, sendMessage } from '../services/messages';
import { fetchListing } from '../services/listings';
import { useAuth } from '../context/AuthContext';
import type { Listing, MoveInTiming, LeaseDuration } from '../types';

const MOVE_IN_OPTIONS = Object.keys(MOVE_IN_LABELS) as MoveInTiming[];
const LEASE_OPTIONS: LeaseDuration[] = [6, 12, 24];

export default function ApplyScreen() {
  const { profile } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const listingId: string = route.params.listingId;

  const [listing, setListing] = useState<Listing | null>(null);
  const [moveIn, setMoveIn] = useState<MoveInTiming>('within_month');
  const [leaseMonths, setLeaseMonths] = useState<LeaseDuration>(12);
  const [occupants, setOccupants] = useState('2');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    let active = true;
    fetchListing(listingId).then(found => {
      if (active) setListing(found);
    });
    return () => {
      active = false;
    };
  }, [listingId]);

  /**
   * Turns the form answers into the message the owner actually reads.
   *
   * The answers lead and the tenant's own words close it, because an owner
   * scanning a thread wants the facts — when, how long, how many — before the
   * pitch. Written as a sentence rather than a labelled block: it has to look
   * like something a person sent, not a form submission pasted into a chat.
   */
  function openingMessage(target: Listing, count: number): string {
    const when = MOVE_IN_LABELS[moveIn].toLowerCase();
    const term = LEASE_LABELS[leaseMonths].toLowerCase();
    const people = count === 1 ? '1 occupant' : `${count} occupants`;

    return (
      `Hello — I am interested in ${target.basicInfo.title}. ` +
      `Looking to move in ${when}, for ${term}, with ${people}.\n\n` +
      message.trim()
    );
  }

  async function handleSubmit() {
    if (!listing || !profile) return;

    const count = parseInt(occupants, 10);
    if (Number.isNaN(count) || count < 1 || count > 10) {
      setError('Number of occupants must be between 1 and 10.');
      return;
    }
    if (count > listing.details.maxOccupants) {
      setError(
        `This property allows up to ${listing.details.maxOccupants} occupants. Reduce the number, or choose a larger place.`,
      );
      return;
    }
    if (message.trim().length < 20) {
      setError(
        `Write a short note to the property owner — at least 20 characters. You have ${message.trim().length}.`,
      );
      return;
    }

    // A listing with no owner cannot be enquired about: there is nobody for the
    // enquiry to reach and nobody to open a conversation with. Caught here so
    // it reads as a broken listing rather than as a raw Firestore rejection
    // about an undefined field, which is what it surfaced as before.
    if (!listing.ownerId) {
      setError(
        'This listing has no owner on record, so it cannot be contacted. Please try another property.',
      );
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await submitApplication(listing, profile, {
        moveIn,
        leaseMonths,
        occupants: count,
        message,
      });

      // The enquiry opens the conversation rather than sitting beside it.
      //
      // These used to be two separate acts: send an enquiry, and separately
      // message the owner — which meant a tenant introduced themselves twice
      // and an owner read the same person in two places. Now the answers become
      // the opening message, and the thread continues from there.
      const conversation = await ensureConversation(
        listing,
        profile,
        listing.ownerName ?? 'The property owner',
      );

      await sendMessage(conversation, profile.uid, openingMessage(listing, count));

      navigation.replace('Chat', { conversationId: conversation.id });
    } catch (err: any) {
      setError(
        err?.message?.includes('permission')
          ? 'Could not send — the database rejected it. The applications rules may not be published yet.'
          : (err?.message ?? 'Could not send your enquiry. Please try again.'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!listing || !profile) {
    return (
      <SafeAreaView style={styles.wrapper}>
        <Text style={styles.loading}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const { savings } = calculateSavings(listing.pricing.annualRent);

  return (
    <SafeAreaView style={styles.wrapper} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Animated.View
          entering={FadeInDown.delay(stagger(0, 80)).duration(duration.normal).easing(easing.out)}
          style={styles.summary}
        >
          <Text style={styles.summaryTitle} numberOfLines={2}>
            {listing.basicInfo.title}
          </Text>
          <Text style={styles.summaryMeta}>
            {listing.location.area} · {formatNaira(listing.pricing.annualRent)}/year
          </Text>
          <Text style={styles.summarySaving}>
            You save from {formatNaira(savings)} renting directly
          </Text>
        </Animated.View>

        <Text style={styles.label}>When would you move in?</Text>
        <View style={styles.chips}>
          {MOVE_IN_OPTIONS.map(option => (
            <Chip
              key={option}
              label={MOVE_IN_LABELS[option]}
              selected={moveIn === option}
              onPress={() => setMoveIn(option)}
            />
          ))}
        </View>

        <Text style={styles.label}>How long do you want to rent for?</Text>
        <View style={styles.chips}>
          {LEASE_OPTIONS.map(option => (
            <Chip
              key={option}
              label={LEASE_LABELS[option]}
              selected={leaseMonths === option}
              onPress={() => setLeaseMonths(option)}
            />
          ))}
        </View>

        <TextField
          label={`Number of occupants (up to ${listing.details.maxOccupants})`}
          value={occupants}
          onChangeText={setOccupants}
        />

        <TextField
          label="A note to the property owner"
          value={message}
          onChangeText={setMessage}
          placeholder="Tell them a little about yourself and when you would like to view the property."
          autoCapitalize="sentences"
          error={error}
        />

        <Text style={styles.privacy}>
          The property owner will see your name and email so they can reply. Nobody else
          can see this enquiry.
        </Text>

        <View style={styles.action}>
          <Button
            label={submitting ? 'Sending…' : 'Send message'}
            onPress={handleSubmit}
            loading={submitting}
            feedback="medium"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Text
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  loading: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  summary: {
    backgroundColor: colors.backgroundPaper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderGold,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    color: colors.textPrimary,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.base,
  },
  summaryMeta: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  summarySaving: {
    color: colors.accentGold,
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.sm,
    marginTop: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    color: colors.textSecondary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
    overflow: 'hidden',
  },
  chipSelected: {
    borderColor: colors.accentGold,
    backgroundColor: colors.backgroundElevated,
    color: colors.accentGold,
  },
  privacy: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  action: { marginTop: spacing.lg },
});
