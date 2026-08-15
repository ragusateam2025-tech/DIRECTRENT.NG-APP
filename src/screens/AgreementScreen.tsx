import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Platform } from 'react-native';
import { colors, typography, spacing, radius } from '../theme/tokens';
import Button from '../components/Button';
import { Chip } from './landlord/steps/BasicInfoStep';
import { useAuth } from '../context/AuthContext';
import { fetchListing } from '../services/listings';
import { fetchConversation } from '../services/messages';
import { printAgreement, shareAgreement } from '../services/agreement';
import {
  agreementMoney,
  endDate,
  formatLongDate,
  type AgreementInput,
} from '../lib/tenancyAgreement';
import { formatNaira } from '../lib/format';
import type { Conversation, Listing } from '../types';

/**
 * Start dates offered, because there is no date picker.
 *
 * A native picker would mean another native module and another rebuild for one
 * field. Three presets cover what actually happens: a tenancy starting at the
 * turn of a month, or today because the tenant is already waiting. Anything
 * else is written onto the printed document by hand, which is where the signing
 * date goes anyway.
 */
function startOptions(now: Date): { label: string; iso: string }[] {
  const firstOf = (monthsAhead: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
    return d;
  };

  return [
    { label: 'Today', iso: now.toISOString() },
    { label: `1 ${firstOf(1).toLocaleDateString('en-GB', { month: 'long' })}`, iso: firstOf(1).toISOString() },
    { label: `1 ${firstOf(2).toLocaleDateString('en-GB', { month: 'long' })}`, iso: firstOf(2).toISOString() },
  ];
}

/** Terms offered, matching the ones the enquiry form already asks about. */
const TERMS = [6, 12, 24];

/**
 * A tenancy agreement, filled in from what both sides already agreed.
 *
 * The value here is not the drafting — it is that nobody retypes anything. The
 * parties, the property, the rent, the deposit and the house rules are already
 * recorded and already visible to both sides; copying them into a template by
 * hand is where the errors and the week of delay come from.
 *
 * Reached from the conversation, and only once the enquiry is accepted. Before
 * that there is nothing to write an agreement about.
 */
export default function AgreementScreen({
  route,
}: {
  route: { params: { conversationId: string } };
}) {
  const { profile } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const now = new Date();
  const options = startOptions(now);
  const [startDate, setStartDate] = useState(options[1].iso);
  const [months, setMonths] = useState(12);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        try {
          const thread = await fetchConversation(route.params.conversationId);
          if (!active || !thread) return;
          setConversation(thread);
          const found = await fetchListing(thread.listingId);
          if (active) setListing(found);
        } catch {
          // Falls through to the empty state below rather than a blank screen.
        } finally {
          if (active) setLoading(false);
        }
      })();

      return () => {
        active = false;
      };
    }, [route.params.conversationId]),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centre} edges={['bottom']}>
        <ActivityIndicator color={colors.accentGold} />
      </SafeAreaView>
    );
  }

  if (!conversation || !listing || !profile) {
    return (
      <SafeAreaView style={styles.centre} edges={['bottom']}>
        <Text style={styles.body}>This agreement could not be loaded.</Text>
      </SafeAreaView>
    );
  }

  const isOwner = profile.uid === conversation.landlordId;
  const money = agreementMoney(listing);

  /**
   * Each side knows its own email and not the other's — the rules restrict a
   * user document to that user alone. The document rules a blank rather than
   * guessing, and the note below says so, so nobody signs a form wondering
   * where a wrong address came from.
   */
  const input: AgreementInput = {
    listing,
    landlord: {
      name: conversation.landlordName,
      email: isOwner ? profile.email : null,
      phone: listing.ownerPhone ?? (isOwner ? profile.phone : null),
    },
    tenant: {
      name: conversation.tenantName,
      email: isOwner ? null : profile.email,
      phone: isOwner ? null : profile.phone,
    },
    startDate,
    months,
    generatedAt: now,
  };

  async function run(action: 'share' | 'print') {
    if (busy) return;
    setBusy(true);
    try {
      if (action === 'print') {
        await printAgreement(input);
      } else if (!(await shareAgreement(input))) {
        Alert.alert(
          'Nothing to share to',
          'This phone has no app that can receive a PDF. Use Print instead, which can save it to your device.',
        );
      }
    } catch (e: any) {
      Alert.alert('Could not prepare the agreement', e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  const start = new Date(startDate);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Tenancy agreement</Text>

        {/* Said first, not in the small print. A generated document that looks
            authoritative and does not say what it is will be signed as though a
            lawyer wrote it. */}
        <View style={styles.notice}>
          <Text style={styles.noticeHeading}>This is a draft</Text>
          <Text style={styles.body}>
            It is filled in from what you both agreed here. It has not been
            settled by a lawyer — have it checked before anyone signs, and fill
            in the blank lines by hand.
          </Text>
        </View>

        <Text style={styles.label}>Property</Text>
        <Text style={styles.value}>{listing.location.address}</Text>
        <Text style={styles.body}>
          {listing.location.area} · {listing.basicInfo.bedrooms} bed
        </Text>

        <Text style={styles.label}>Parties</Text>
        <Text style={styles.value}>{conversation.landlordName} — landlord</Text>
        <Text style={styles.value}>{conversation.tenantName} — tenant</Text>
        <Text style={styles.body}>
          Addresses, and whichever email address is not yours, are left blank for
          you to complete. We do not hold them.
        </Text>

        <Text style={styles.label}>Starts</Text>
        <View style={styles.chips}>
          {options.map(o => (
            <Chip
              key={o.iso}
              label={o.label}
              selected={startDate === o.iso}
              onPress={() => setStartDate(o.iso)}
            />
          ))}
        </View>

        <Text style={styles.label}>Term</Text>
        <View style={styles.chips}>
          {TERMS.map(m => (
            <Chip
              key={m}
              label={m === 12 ? '1 year' : m === 24 ? '2 years' : '6 months'}
              selected={months === m}
              onPress={() => setMonths(m)}
            />
          ))}
        </View>
        <Text style={styles.body}>
          Runs to {formatLongDate(endDate(start, months))}.
        </Text>

        <Text style={styles.label}>Money</Text>
        <Text style={styles.value}>{formatNaira(money.rent)} a year</Text>
        <Text style={styles.body}>
          {money.caution > 0
            ? `Caution deposit ${formatNaira(money.caution)} (${money.cautionMonths} months), refundable.`
            : 'No caution deposit.'}
        </Text>
        <Text style={styles.body}>
          {money.serviceCharge > 0
            ? `Service charge ${formatNaira(money.serviceCharge)} a year.`
            : 'No service charge.'}
        </Text>

        <View style={styles.actions}>
          <Button label="Share the PDF" onPress={() => run('share')} loading={busy} />
          {/* Android's print sheet also offers "Save as PDF", which is how
              somebody keeps a copy without emailing it to themselves. */}
          {Platform.OS === 'android' && (
            <>
              <View style={styles.spacer} />
              <Button label="Print or save" variant="secondary" onPress={() => run('print')} />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centre: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  heading: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
    marginBottom: spacing.md,
  },
  notice: {
    backgroundColor: colors.backgroundPaper,
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  noticeHeading: {
    color: colors.accentGold,
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.base,
    marginBottom: spacing.xs,
  },
  label: {
    color: colors.accentGold,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.xs,
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  value: {
    color: colors.textPrimary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.base,
  },
  body: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    marginTop: 2,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  actions: { marginTop: spacing.xl },
  spacer: { height: spacing.sm },
});
