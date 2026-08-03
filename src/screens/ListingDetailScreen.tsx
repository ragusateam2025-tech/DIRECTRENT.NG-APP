import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { duration, easing, stagger } from '../theme/motion';
import Button from '../components/Button';
import SavingsBreakdown from '../components/SavingsBreakdown';
import { formatNaira } from '../lib/format';
import { formatNigerianPhone } from '../lib/phone';
import { fetchListing } from '../services/listings';
import { isSaved, toggleSaved } from '../services/saved';
import { hasApplied } from '../services/applications';
import { useAuth } from '../context/AuthContext';
import { allImageSources } from '../lib/listingImage';
import { groupAmenities } from '../data/amenities';
import { amenityIcon } from '../components/icons/AmenityIcon';
import PhotoGallery from '../components/PhotoGallery';
import TourBanner from '../components/TourBanner';
import AnimatedSaveIcon from '../components/icons/AnimatedSaveIcon';
import { IconMessages, IconChevron, IconCall, IconCheck } from '../components/icons/Icon';
import { ensureConversation } from '../services/messages';
import type { Listing } from '../types';

/**
 * Typed structurally rather than against one stack, because this screen is
 * reached from both the tenant Browse stack and the owner Listings stack.
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
  // Bumped only by a deliberate save, so loading a saved listing stays still.
  const [savePulse, setSavePulse] = useState(0);
  const [applied, setApplied] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [amenitiesOpen, setAmenitiesOpen] = useState(false);

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

  /**
   * Opens the thread for this property, creating it on first contact.
   *
   * An owner viewing their own listing has nobody to message, so the button
   * is hidden for them rather than opening a conversation with themselves.
   */
  async function handleMessageLandlord() {
    if (!profile || !listing || messaging) return;
    setMessaging(true);
    try {
      const conversation = await ensureConversation(
        listing,
        profile,
        listing.ownerName ?? 'The property owner',
      );
      navigation.navigate('Chat', { conversationId: conversation.id });
    } catch {
      // Non-fatal — the screen stays put and the tenant can retry.
    } finally {
      setMessaging(false);
    }
  }

  /**
   * Places the call through the phone's own dialler.
   *
   * Out of app deliberately: it uses the network the tenant already pays for,
   * works on a weak connection where voice over data would not, and shows the
   * owner a real number they can call back. In-app voice needs a provider and
   * is not wired up — see the note where the number is resolved.
   */
  function handleCall() {
    const number = listing?.ownerPhone;

    if (!number) {
      Alert.alert(
        'No number listed',
        'This owner has not shared a phone number. Send them a message instead and they can reply with one.',
      );
      return;
    }

    Linking.openURL(`tel:${number}`).catch(() => {
      Alert.alert('Could not open the dialler', `Call ${formatNigerianPhone(number)} directly.`);
    });
  }

  async function handleToggleSave() {
    if (!profile) return;
    try {
      const next = await toggleSaved(profile.uid, listingId);
      setSaved(next);
      // Only saving plays the motion. Unsaving is a removal, not an arrival.
      if (next) setSavePulse(current => current + 1);
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

  const photos = allImageSources(listing);

  return (
    <ScrollView style={styles.wrapper} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeIn.duration(duration.quick)}>
        <PhotoGallery photos={photos} fallbackLabel={listing.location.area} />
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
        {/* Shown only when the owner answered. Absent means unstated, which is
            honest — inferring "no" from silence would mislead a tenant about
            the thing they most want to know before travelling. */}
        {listing.ownerOccupied !== undefined && (
          <Fact
            value={listing.ownerOccupied ? 'Yes' : 'No'}
            label="Owner on site"
          />
        )}
      </Animated.View>

      <SavingsBreakdown annualRent={listing.pricing.annualRent} />

      {/* Tenants only. An owner looking at their own listing is not the person
          being offered a tour of it. */}
      {listing.ownerId !== profile?.uid && <TourBanner />}

      <Text style={styles.sectionHeading}>About this property</Text>
      <Text style={styles.description}>{listing.details.description}</Text>

      {/*
        Collapsed by default. Amenities are a checklist someone consults once
        they are already interested, and listing them in full pushes the two
        things that decide interest — the savings and the enquiry button —
        further down the screen. The count is on the header so it stays useful
        while closed: "8 listed" answers the question most people are asking
        without opening anything.
      */}
      <Pressable
        onPress={() => setAmenitiesOpen(open => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: amenitiesOpen }}
        accessibilityLabel={`Amenities, ${listing.details.amenities.length} listed`}
        style={({ pressed }) => [styles.disclosure, pressed && styles.disclosurePressed]}
      >
        <Text style={[styles.sectionHeading, styles.disclosureHeading]}>Amenities</Text>
        <View style={styles.disclosureRight}>
          <Text style={styles.disclosureCount}>
            {listing.details.amenities.length} listed
          </Text>
          <View style={amenitiesOpen ? styles.chevronOpen : undefined}>
            <IconChevron size={18} color={colors.accentGold} />
          </View>
        </View>
      </Pressable>

      {amenitiesOpen && (
        <Animated.View
          entering={FadeIn.duration(duration.quick)}
          style={styles.amenities}
        >
          {groupAmenities(listing.details.amenities).map(group => (
            <View key={group.label} style={styles.amenityGroup}>
              <Text style={styles.amenityGroupLabel}>{group.label}</Text>
              {group.items.map(amenity => {
                const Glyph = amenityIcon(amenity, group.label);
                return (
                <View key={amenity} style={styles.amenityRow}>
                  <Glyph size={19} color={colors.accentGold} />
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
                );
              })}
            </View>
          ))}
        </Animated.View>
      )}

      <View style={styles.actions}>
        {/*
          One way in, not two.

          Enquiring and messaging were separate buttons that did nearly the
          same thing, so a tenant introduced themselves twice and an owner read
          the same person in two places. The enquiry answers are now how a
          conversation opens: once one exists, this goes straight to it.
        */}
        {/* Requires a known owner as well as it not being you. Without the
            first check a listing missing ownerId offers contact buttons that
            cannot possibly work. */}
        {!!listing.ownerId && listing.ownerId !== profile?.uid && (
          <>
            <Button
              label={applied ? 'Open conversation' : 'Message property owner'}
              icon={<IconMessages size={18} color={colors.textPrimary} />}
              loading={messaging}
              onPress={
                applied
                  ? handleMessageLandlord
                  : () => navigation.navigate('Apply', { listingId })
              }
              feedback="medium"
            />
            <View style={styles.actionSpacer} />
            <Button
              label="Call property owner"
              variant="secondary"
              icon={<IconCall size={18} color={colors.accentGold} />}
              onPress={handleCall}
            />
          </>
        )}
        <View style={styles.actionSpacer} />
        <Button
          label={saved ? 'Saved' : 'Save property'}
          variant="secondary"
          icon={<AnimatedSaveIcon saved={saved} pulse={savePulse} size={18} color={colors.accentGold} />}
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
  amenities: {},
  /**
   * Header row for a collapsible section. The heading keeps its own style so
   * the section reads identically to the ones that do not collapse — nothing
   * announces "this is a widget", only the count and the chevron.
   */
  disclosure: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // The row owns the section spacing, not the heading inside it. Leaving it
    // on the heading pushed the count and chevron out of line with the text
    // they belong to.
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  disclosureHeading: { marginTop: 0, marginBottom: 0 },
  disclosurePressed: { opacity: 0.85 },
  disclosureRight: { flexDirection: 'row', alignItems: 'center' },
  disclosureCount: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginRight: spacing.xs,
  },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  /** Squared off to match the controls on Profile, standing on a ground line. */
  /** Two columns on a phone would truncate the longer labels, so one column. */
  amenityGroup: { marginBottom: spacing.md },
  amenityGroupLabel: {
    color: colors.accentGold,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.xs,
    marginBottom: spacing.xs,
  },
  amenityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  amenityText: {
    marginLeft: spacing.sm,
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
  },
  actions: { marginTop: spacing.lg },
  actionSpacer: { height: spacing.sm },
});
