import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
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
  detachTour,
  fetchCapturedTours,
  fetchTourQueue,
  InvalidTourUrl,
} from '../../services/tours';
import { useAuth } from '../../context/AuthContext';
import type { Listing } from '../../types';

type Tab = 'waiting' | 'done';

/**
 * The operator's whole job, on one screen.
 *
 * Written for someone whose computer skills stop at a browser, so the only
 * thing it ever asks for is a pasted link. There are no document IDs anywhere:
 * properties are identified by their photograph and their address, which is
 * what the operator was standing in front of an hour earlier.
 *
 * The queue is the job list. A property appears because an owner asked for a
 * shoot, and leaves when a tour is attached — so "what is left to do" is not
 * something anyone has to maintain, it is just what this screen shows.
 */
export default function TourQueueScreen() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('waiting');
  const [waiting, setWaiting] = useState<Listing[]>([]);
  const [done, setDone] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [queue, captured] = await Promise.all([fetchTourQueue(), fetchCapturedTours()]);
      setWaiting(queue);
      setDone(captured);
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
    setError('');
  }

  async function save(listing: Listing) {
    if (saving || !profile) return;

    setSaving(true);
    setError('');
    try {
      await attachTour(listing.id, link, profile.uid);
      setOpenId(null);
      setLink('');
      await load();
      Alert.alert('Tour attached', `${listing.location.address} now has a 360 tour.`);
    } catch (e: any) {
      if (e instanceof InvalidTourUrl) {
        setError(e.message);
      } else {
        setError(e?.message ?? 'Could not save the link. Try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  function confirmRemove(listing: Listing) {
    Alert.alert(
      'Remove this tour?',
      'The property goes back into the waiting list. The panoramas themselves are not deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await detachTour(listing.id);
              await load();
            } catch (e: any) {
              Alert.alert('Could not remove it', e?.message ?? String(e));
            }
          },
        },
      ],
    );
  }

  const data = tab === 'waiting' ? waiting : done;

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
          </View>
        </Pressable>

        {open && (
          <View style={styles.editor}>
            <TextField
              label="Tour link"
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
            <Button label="Save tour" onPress={() => save(item)} loading={saving} />
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
          </View>
        )}
      </Animated.View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab('waiting')}
          style={[styles.tab, tab === 'waiting' && styles.tabOn]}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'waiting' }}
        >
          <Text style={[styles.tabText, tab === 'waiting' && styles.tabTextOn]}>
            To shoot ({waiting.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('done')}
          style={[styles.tab, tab === 'done' && styles.tabOn]}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'done' }}
        >
          <Text style={[styles.tabText, tab === 'done' && styles.tabTextOn]}>
            Done ({done.length})
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentGold} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title={tab === 'waiting' ? 'Nothing waiting' : 'No tours yet'}
              body={
                tab === 'waiting'
                  ? 'When a property owner asks for a 360 tour while listing, it appears here.'
                  : 'Tours you attach appear here, so you can check them before a tenant does.'
              }
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  tabs: { flexDirection: 'row', padding: spacing.md, paddingBottom: 0 },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
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
  editor: {
    padding: spacing.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  help: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  spacer: { height: spacing.sm },
});
