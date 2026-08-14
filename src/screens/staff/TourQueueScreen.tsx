import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing, radius } from '../../theme/tokens';
import { duration, easing, stagger } from '../../theme/motion';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import EmptyState from '../../components/EmptyState';
import { primaryImageSource } from '../../lib/listingImage';
import {
  attachTour,
  decideTourRequest,
  detachTour,
  fetchTourQueue,
  InvalidTourUrl,
  MissingDeclineReason,
  reopenTourRequest,
  type TourQueue,
} from '../../services/tours';
import { useAuth } from '../../context/AuthContext';
import type { Listing } from '../../types';

type Tab = 'new' | 'shoot' | 'done' | 'declined';

const EMPTY: TourQueue = { pending: [], approved: [], done: [], declined: [] };

/**
 * How each pile is labelled and what an empty one should say.
 *
 * Kept together because the four tabs differ only in these three strings and
 * which array they read — writing them as four blocks of JSX would be four
 * places to forget to change something.
 */
const TABS: {
  id: Tab;
  label: string;
  bucket: keyof TourQueue;
  emptyTitle: string;
  emptyBody: string;
}[] = [
  {
    id: 'new',
    label: 'New',
    bucket: 'pending',
    emptyTitle: 'Nothing to decide',
    emptyBody:
      'When a property owner asks for a 360 tour while listing, it appears here for a yes or a no.',
  },
  {
    id: 'shoot',
    label: 'To shoot',
    bucket: 'approved',
    emptyTitle: 'Nothing to shoot',
    emptyBody: 'Requests you approve appear here until a tour is attached.',
  },
  {
    id: 'done',
    label: 'Done',
    bucket: 'done',
    emptyTitle: 'No tours yet',
    emptyBody: 'Tours you attach appear here, so you can check them before a tenant does.',
  },
  {
    id: 'declined',
    label: 'Declined',
    bucket: 'declined',
    emptyTitle: 'Nothing declined',
    emptyBody: 'Requests you turn down stay here, so a wrong call can be put back.',
  },
];

/**
 * The operator's whole job, on one screen.
 *
 * Written for someone whose computer skills stop at a browser, so the only
 * things it ever asks for are a yes, a no with a sentence, and a pasted link.
 * There are no document IDs anywhere: properties are identified by their
 * photograph and their address, which is what the operator was standing in
 * front of an hour earlier.
 *
 * The queue is the job list. A property appears because an owner asked, moves
 * as it is decided and shot, and every pile is derived from the listing itself
 * — so "what is left to do" is not something anyone has to maintain, it is just
 * what this screen shows.
 */
export default function TourQueueScreen() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('new');
  const [queue, setQueue] = useState<TourQueue>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setQueue(await fetchTourQueue());
    } catch (e: any) {
      // Named plainly. A permission error here means the staff flag is missing,
      // which is a fixable thing someone should be told rather than a spinner
      // that never stops.
      Alert.alert('Could not load the queue', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function openFor(listing: Listing) {
    setOpenId(current => (current === listing.id ? null : listing.id));
    setLink(listing.tour?.embedUrl ?? '');
    setReason('');
    setError('');
  }

  /** Closes the card, clears the form and reloads every pile. */
  async function done() {
    setOpenId(null);
    setLink('');
    setReason('');
    await load();
  }

  async function decide(listing: Listing, status: 'approved' | 'declined') {
    if (busy || !profile) return;

    setBusy(true);
    setError('');
    try {
      await decideTourRequest(listing.id, status, profile.uid, reason);
      await done();
      Alert.alert(
        status === 'approved' ? 'Approved' : 'Declined',
        status === 'approved'
          ? `${listing.location.address} is on the list to shoot.`
          : `${listing.location.address} was turned down, and the owner sees your reason.`,
      );
    } catch (e: any) {
      // The missing reason is a form error, not a failure — it belongs under
      // the field the operator has to fill in, not in a dialog they dismiss.
      setError(
        e instanceof MissingDeclineReason
          ? e.message
          : (e?.message ?? 'Could not save that. Try again.'),
      );
    } finally {
      setBusy(false);
    }
  }

  async function save(listing: Listing) {
    if (busy || !profile) return;

    setBusy(true);
    setError('');
    try {
      await attachTour(listing.id, link, profile.uid);
      await done();
      Alert.alert('Tour attached', `${listing.location.address} now has a 360 tour.`);
    } catch (e: any) {
      if (e instanceof InvalidTourUrl) {
        setError(e.message);
      } else {
        setError(e?.message ?? 'Could not save the link. Try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  function confirmRemove(listing: Listing) {
    Alert.alert(
      'Remove this tour?',
      'The property goes back onto the list to shoot. The panoramas themselves are not deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await detachTour(listing.id);
              await done();
            } catch (e: any) {
              Alert.alert('Could not remove it', e?.message ?? String(e));
            }
          },
        },
      ],
    );
  }

  async function reopen(listing: Listing) {
    try {
      await reopenTourRequest(listing.id);
      await done();
    } catch (e: any) {
      Alert.alert('Could not reopen it', e?.message ?? String(e));
    }
  }

  function renderItem({ item, index }: { item: Listing; index: number }) {
    const image = primaryImageSource(item);
    const open = openId === item.id;

    return (
      <Animated.View
        entering={FadeInDown.delay(stagger(index)).duration(duration.normal).easing(easing.out)}
        style={styles.card}
      >
        <Pressable onPress={() => openFor(item)} style={styles.row}>
          {image ? (
            <Image source={image} style={styles.thumb} resizeMode="cover" />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty]} />
          )}

          <View style={styles.rowText}>
            {/* Address first, not the title. The operator matches this against
                the place they drove to, and nobody remembers a listing title. */}
            <Text style={styles.address} numberOfLines={2}>
              {item.location.address}
            </Text>
            <Text style={styles.area}>
              {item.location.area} · {item.basicInfo.bedrooms} bed
            </Text>
            {!!item.ownerName && <Text style={styles.owner}>{item.ownerName}</Text>}
            {/* The reason is on the row rather than hidden behind a tap. The
                declined pile is read to remember why, and making somebody open
                each card to find out defeats the point of keeping them. */}
            {tab === 'declined' && !!item.tourReview?.reason && (
              <Text style={styles.reason}>“{item.tourReview.reason}”</Text>
            )}
          </View>
        </Pressable>

        {open && (
          <View style={styles.editor}>
            {tab === 'new' ? (
              <>
                <Text style={styles.help}>
                  Approve if we cover this area and the property looks ready to
                  shoot. If not, say why — the owner reads it.
                </Text>
                <TextField
                  label="Reason (only needed to decline)"
                  value={reason}
                  onChangeText={setReason}
                  placeholder="We do not cover Ikorodu yet."
                  autoCapitalize="sentences"
                  error={error}
                />
                <Button
                  label="Approve"
                  onPress={() => decide(item, 'approved')}
                  loading={busy}
                />
                <View style={styles.spacer} />
                <Button
                  label="Decline"
                  variant="secondary"
                  onPress={() => decide(item, 'declined')}
                />
              </>
            ) : tab === 'declined' ? (
              <>
                <Text style={styles.help}>
                  Putting this back makes it a new request again, and the owner
                  stops seeing the decline.
                </Text>
                <Button label="Put back in the queue" onPress={() => reopen(item)} />
              </>
            ) : (
              <>
                <TextField
                  label="Tour link"
                  autoCorrect={false}
                  value={link}
                  onChangeText={setLink}
                  placeholder="https://…"
                  autoCapitalize="none"
                  error={error}
                />
                <Text style={styles.help}>
                  Open the tour in Kuula, press Share, copy the link and paste it
                  here. Paste the whole thing, including https.
                </Text>
                <Button label="Save tour" onPress={() => save(item)} loading={busy} />
                {!!item.tour && (
                  <>
                    <View style={styles.spacer} />
                    <Button
                      label="Remove tour"
                      variant="secondary"
                      onPress={() => confirmRemove(item)}
                    />
                  </>
                )}
              </>
            )}
          </View>
        )}
      </Animated.View>
    );
  }

  const active = TABS.find(t => t.id === tab) ?? TABS[0];

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      {/* Scrolls sideways because four labels with counts do not fit across a
          720px phone, and truncating "Declined" to "Decli…" would be worse than
          asking for a swipe. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsRow}
        contentContainerStyle={styles.tabs}
      >
        {TABS.map(t => (
          <Pressable
            key={t.id}
            onPress={() => {
              setTab(t.id);
              setOpenId(null);
              setError('');
            }}
            style={[styles.tab, tab === t.id && styles.tabOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.id }}
          >
            <Text style={[styles.tabText, tab === t.id && styles.tabTextOn]}>
              {t.label} ({queue[t.bucket].length})
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentGold} />
        </View>
      ) : (
        <FlatList
          data={queue[active.bucket]}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState title={active.emptyTitle} body={active.emptyBody} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  /**
   * A horizontal ScrollView fills the height it is given unless told not to,
   * which stretched this one down the screen and left the active tab's
   * underline floating halfway to the list.
   */
  tabsRow: { flexGrow: 0, flexShrink: 0 },
  tabs: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabOn: { borderBottomColor: colors.accentGold },
  tabText: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
  },
  tabTextOn: { color: colors.textPrimary, fontFamily: typography.families.bodyMedium },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md },
  card: {
    backgroundColor: colors.backgroundPaper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', padding: spacing.md },
  thumb: { width: 64, height: 64, borderRadius: radius.sm },
  thumbEmpty: { backgroundColor: colors.backgroundElevated },
  rowText: { flex: 1, marginLeft: spacing.md },
  address: {
    color: colors.textPrimary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.base,
  },
  area: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  owner: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  reason: {
    color: colors.accentGold,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  editor: {
    padding: spacing.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  help: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  spacer: { height: spacing.sm },
});
