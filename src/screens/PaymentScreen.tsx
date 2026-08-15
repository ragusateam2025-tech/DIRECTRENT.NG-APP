import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, radius } from '../theme/tokens';
import Button from '../components/Button';
import { fetchListing } from '../services/listings';
import {
  startPayment,
  watchPayment,
  type PaymentStatus,
  type StartedPayment,
} from '../services/payments';
import { calculatePayment } from '../lib/payment';
import { formatNaira } from '../lib/format';
import { TRADITIONAL_FEE_LABEL, calculateSavings } from '../lib/savings';
import type { Listing } from '../types';

/**
 * Paying for a tenancy.
 *
 * Three states and they are deliberately separate: what you are about to pay,
 * Paystack's own checkout in a WebView, and then waiting on the webhook.
 *
 * That last wait is the important one. The app never decides a payment
 * succeeded — anybody can navigate to a success URL, so a screen that trusted
 * the browser coming back would be trivially cheatable. Paystack tells our
 * server over a signed webhook, the server writes the payment document, and
 * this screen watches that document. It is slower and it is the only version
 * that is true.
 */
type Stage = 'review' | 'checkout' | 'waiting' | 'done';

export default function PaymentScreen({
  route,
}: {
  route: { params: { listingId: string } };
}) {
  const navigation = useNavigation<any>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [stage, setStage] = useState<Stage>('review');
  const [started, setStarted] = useState<StartedPayment | null>(null);
  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const unwatch = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetchListing(route.params.listingId)
      .then(setListing)
      .catch(() => setError('Could not load this property.'));
  }, [route.params.listingId]);

  // Detaches the listener when the screen goes, so a payment left open does not
  // keep a Firestore subscription alive behind it.
  useEffect(() => () => unwatch.current?.(), []);

  async function begin() {
    if (busy || !listing) return;
    setBusy(true);
    setError('');
    try {
      const payment = await startPayment(listing.id);
      setStarted(payment);

      // Watching begins before the checkout opens, not after. The webhook can
      // arrive while the tenant is still looking at Paystack's success page,
      // and a listener attached afterwards would miss it.
      unwatch.current = watchPayment(
        payment.reference,
        next => {
          setStatus(next);
          if (next !== 'pending') setStage('done');
        },
        message => setError(message),
      );

      setStage('checkout');
    } catch (e: any) {
      setError(e?.message ?? 'Could not start the payment.');
    } finally {
      setBusy(false);
    }
  }

  const onCheckoutDone = useCallback(() => {
    // Paystack has finished with the tenant, which says nothing about whether
    // money moved. The wait continues until the webhook says otherwise.
    setStage(current => (current === 'checkout' ? 'waiting' : current));
  }, []);

  if (!listing) {
    return (
      <SafeAreaView style={styles.centre} edges={['bottom']}>
        {error ? <Text style={styles.body}>{error}</Text> : <ActivityIndicator color={colors.accentGold} />}
      </SafeAreaView>
    );
  }

  const breakdown = started?.breakdown ?? calculatePayment(listing);
  const savings = calculateSavings(listing.pricing.annualRent);

  if (stage === 'checkout' && started) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <WebView
          source={{ uri: started.authorizationUrl }}
          // Pinned to Paystack. This screen carries card details, and a
          // checkout that can be navigated anywhere is a checkout that can be
          // navigated to a page collecting them.
          onShouldStartLoadWithRequest={request => {
            try {
              return new URL(request.url).host.endsWith('paystack.com');
            } catch {
              return false;
            }
          }}
          onNavigationStateChange={nav => {
            // Paystack sends the tenant to a callback once they are finished,
            // successfully or not.
            if (nav.url.includes('/close') || nav.url.includes('callback')) {
              onCheckoutDone();
            }
          }}
          setSupportMultipleWindows={false}
          startInLoadingState
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {stage === 'done' ? (
          <View style={styles.result}>
            <Text style={styles.heading}>
              {status === 'paid' ? 'Payment confirmed' : 'Payment not completed'}
            </Text>
            <Text style={styles.body}>
              {status === 'paid'
                ? `${formatNaira(breakdown.total)} received for ${listing.location.address}. The owner has been notified.`
                : status === 'mismatch'
                  ? 'The amount received did not match what was agreed. Nothing has been marked paid — contact us before paying again.'
                  : 'No money was taken. You can try again whenever you are ready.'}
            </Text>
            <View style={styles.actions}>
              <Button label="Done" onPress={() => navigation.goBack()} />
            </View>
          </View>
        ) : stage === 'waiting' ? (
          <View style={styles.result}>
            <ActivityIndicator color={colors.accentGold} />
            <Text style={styles.heading}>Confirming your payment</Text>
            {/* Said plainly, because the honest reason for the wait is also the
                reassuring one. */}
            <Text style={styles.body}>
              We are waiting for Paystack to confirm this directly with us rather
              than taking your phone's word for it. It usually takes a few
              seconds. You can close the app — this will be right when you come
              back.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.heading}>What you are paying</Text>
            <Text style={styles.body}>{listing.location.address}</Text>

            <View style={styles.rows}>
              <Row label="Annual rent" value={formatNaira(breakdown.annualRent)} />
              <Row label="Caution deposit" value={formatNaira(breakdown.cautionDeposit)} />
              {breakdown.serviceCharge > 0 && (
                <Row label="Service charge" value={formatNaira(breakdown.serviceCharge)} />
              )}
              <Row label="Directrent.ng fee (2%)" value={formatNaira(breakdown.platformFee)} />
              <View style={styles.divider} />
              <Row label="Total" value={formatNaira(breakdown.total)} strong />
            </View>

            {/* The comparison belongs here more than anywhere: this is the
                moment somebody is handing over money and remembering what the
                alternative costs. */}
            <Text style={styles.note}>
              {TRADITIONAL_FEE_LABEL} on this property would be{' '}
              {formatNaira(savings.traditionalFees)}. You are paying{' '}
              {formatNaira(breakdown.platformFee)}.
            </Text>

            <Text style={styles.note}>
              The caution deposit is refundable and is held by the property
              owner, not by us.
            </Text>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.actions}>
              <Button
                label={busy ? 'Opening Paystack…' : `Pay ${formatNaira(breakdown.total)}`}
                onPress={begin}
                loading={busy}
                feedback="medium"
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centre: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  heading: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  rows: {
    backgroundColor: colors.backgroundPaper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  rowLabel: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    flex: 1,
  },
  rowValue: {
    color: colors.textPrimary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
  },
  strong: {
    color: colors.accentGold,
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.base,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  body: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    lineHeight: 21,
  },
  note: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    marginTop: spacing.md,
  },
  error: {
    color: colors.errorLight,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.md,
  },
  result: { alignItems: 'center', paddingTop: spacing.xl },
  actions: { marginTop: spacing.xl, alignSelf: 'stretch' },
});
