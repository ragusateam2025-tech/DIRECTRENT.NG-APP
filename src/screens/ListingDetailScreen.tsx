import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { duration, easing, stagger } from '../theme/motion';
import Button from '../components/Button';
import SavingsBreakdown from '../components/SavingsBreakdown';
import { formatNaira } from '../lib/format';
import { fetchListing } from '../services/listings';
import { isSaved, toggleSaved } from '../services/saved';
import { hasApplied } from '../services/applications';
import { useAuth } from '../context/AuthContext';
import { primaryImageSource } from '../lib/listingImage';
import { IconSaved } from '../components/icons/Icon';
import type { Listing } from '../types';

/**
 * Typed structurally rather than against one stack, because this screen is
 * reached from both the tenant Browse stack and the landlord Listings stack.
 * All it needs is the listing id.
 */
interface Props {
  route: { params: { listingId: string } };
}

export default function ListingDetailScreen({ route }: Props) {
  const { listingId } = route.params;
  const { profile } = useAuth();
  const navigation = useNavigation<any>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);

  // Refetches on focus so returning from the enquiry form shows the sent state
  // without a manual reload.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        const result = await fetchListing(listingId);
        if (!active) return;
        setListing(result);

        if (profile) {
          // Both are best-effort: a listing must still render if either fails.
          try {
            const savedState = await isSaved(profile.uid, listingId);
            if (active) setSaved(savedState);
          } catch {
            // Save state just shows as unsaved.
          }
          try {
            const appliedState = await hasApplied(listingId, profile.uid);
            if (active) setApplied(appliedState);
          } catch {
            // Enquiry state falls back to allowing another attempt.
          }
        }

        if (active) setLoading(false);
      }

      load();
      return () => {
        active = false;
      };
    }, [listingId, profile]),
  );

  async function handleToggleSave() {
    if (!profile) return;
    try {
      const next = await toggleSaved(profile.uid, listingId);
      setSaved(next);
      // Saving is a commitment, so it earns a firmer tap than navigation does.
      Haptics.notificationAsync(
        next
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      ).catch(() => {});
    } catch {
      // Non-fatal during a demo — leave the current state alone.
    }
  }

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={colors.accentGold} />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.centre}>
        <Text style={styles.missing}>This property is no longer available.</Text>
      </View>
    );
  }

  const image = primaryImageSource(listing);

  return (
    <ScrollView style={styles.wrapper} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeIn.duration(duration.quick)} style={styles.heroWrap}>
        {image ? (
          <Image source={image} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderArea}>{listing.location.area}</Text>
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(26,10,10,0.9)']}
          style={styles.heroScrim}
          pointerEvents="none"
        />
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(stagger(0, 90)).duration(duration.normal).easing(easing.out)}
      >
        <Text style={styles.title}>{listing.basicInfo.title}</Text>
        <Text style={styles.address}>{listing.location.address}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.rent}>{formatNaira(listing.pricing.annualRent)}</Text>
          <Text style={styles.perYear}>/year</Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(stagger(1, 90)).duration(duration.normal).easing(easing.out)}
        style={styles.facts}
      >
        <Fact value={String(listing.basicInfo.bedrooms)} label="Bedrooms" />
        <Fact value={String(listing.basicInfo.bathrooms)} label="Bathrooms" />
        <Fact value={String(listing.details.maxOccupants)} label="Max occupants" />
      </Animated.View>

      <SavingsBreakdown annualRent={listing.pricing.annualRent} />

      <Text style={styles.sectionHeading}>About this property</Text>
      <Text style={styles.description}>{listing.details.description}</Text>

      <Text style={styles.sectionHeading}>Amenities</Text>
      <View style={styles.amenities}>
        {listing.details.amenities.map(amenity => (
          <View key={amenity} style={styles.amenityChip}>
            <Text style={styles.amenityText}>{amenity}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          label={applied ? 'Enquiry sent' : 'Enquire about this property'}
          onPress={() => navigation.navigate('Apply', { listingId })}
          disabled={applied}
          feedback="medium"
        />
        <View style={styles.actionSpacer} />
        <Button
          label={saved ? 'Saved' : 'Save this property'}
          variant="secondary"
          icon={<IconSaved size={18} color={colors.accentGold} filled={saved} />}
          onPress={handleToggleSave}
        />
      </View>
    </ScrollView>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factValue}>{value}</Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing['2xl'] },
  centre: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missing: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
  },
  heroWrap: {
    width: '100%',
    height: 240,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  heroScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 90 },
  image: { width: '100%', height: '100%' },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderArea: {
    color: colors.accentGold,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['3xl'],
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['2xl'],
    marginTop: spacing.md,
  },
  address: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.md },
  rent: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['3xl'],
  },
  perYear: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    marginLeft: spacing.xs,
  },
  facts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundPaper,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  fact: { alignItems: 'center', flex: 1 },
  factValue: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
  },
  factLabel: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    marginTop: spacing.xs,
  },
  sectionHeading: {
    color: colors.textPrimary,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  description: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    lineHeight: 24,
  },
  amenities: { flexDirection: 'row', flexWrap: 'wrap' },
  amenityChip: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  amenityText: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
  },
  actions: { marginTop: spacing.lg },
  actionSpacer: { height: spacing.sm },
});
