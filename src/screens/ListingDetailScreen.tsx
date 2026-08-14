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
import {
  ALTERATION_LABELS,
  ALTERATION_NOTE,
  AVAILABLE_FROM_LABELS,
  MINIMUM_LEASE_LABELS,
  PET_LABELS,
  SMOKING_LABELS,
} from '../data/rules';
import AnimatedAmenityIcon from '../components/icons/AnimatedAmenityIcon';
import PhotoGallery from '../components/PhotoGallery';
import TourBanner from '../components/TourBanner';
import AnimatedSaveIcon from '../components/icons/AnimatedSaveIcon';
import {
  IconMessages,
  IconChevron,
  IconCall,
  IconShare,
} from '../components/icons/Icon';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { deleteListing, setListingRented } from '../services/landlord';
import {
  fetchListingStats,
  recordListingView,
  type ListingStats,
} from '../services/analytics';
import { ensureConversation } from '../services/messages';
import { shareListing } from '../lib/shareListing';
import type { Listing } from '../types';

/**
 * Typed structurally rather than against one stack, because this screen is
 * reached from both the tenant Browse stack and the owner Listings stack.
 * All it needs is the listing id.
 */
interface Props {
  route: { name: string; params: { listingId: string } };
}

export default function ListingDetailScreen({ route }: Props) {
  const { listingId } = route.params;
  /**
   * The listing itself is protected too, not only the full-screen viewer.
   *
   * The gallery here shows each photograph at a readable size, and a screenshot
   * of this screen carries the address, the rent and the pictures together —
   * which is the whole listing, ready to be reposted somewhere else.
   *
   * The cost of this is real and worth naming: a tenant can no longer
   * screenshot a property to send to whoever is helping them decide. The Share
   * button exists for exactly that journey, and it is now the only route.
   */
  usePreventScreenCapture();
  /**
   * This screen is mounted in two stacks: as `ListingDetail` under Browse and
   * as `LandlordListingDetail` under My properties. Only the landlord stack
   * contains the wizard, so offering Edit from Browse would navigate to a route
   * that does not exist there.
   *
   * A "both" account can reach its own listing from either side, so owning the
   * listing is not enough on its own to know the wizard is reachable.
   */
  const canReachWizard = route.name === 'LandlordListingDetail';
  const [deleting, setDeleting] = useState(false);
  const [changingAvailability, setChangingAvailability] = useState(false);
  const [stats, setStats] = useState<ListingStats | null>(null);
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

          const owner = result?.ownerId === profile.uid;

          if (owner) {
            // Only the owner is shown the figures, so only the owner pays for
            // the three count queries.
            fetchListingStats(listingId)
              .then(next => {
                if (active) setStats(next);
              })
              .catch(() => {});
          } else {
            // An owner opening their own advert is not interest, and counting
            // it would make the number flattering and useless. Not awaited:
            // nobody should wait on a statistic to read a listing.
            recordListingView(listingId, profile.uid).catch(() => {});
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

  async function handleShare() {
    if (!listing) return;
    try {
      await shareListing(listing);
    } catch (err: any) {
      // The user asked for the sheet, so a failure to open it is theirs to
      // know about. Cancelling is not a failure and does not reach here.
      Alert.alert('Could not open sharing', err?.message ?? 'Please try again.');
    }
  }

  /**
   * Takes the property off the market, or puts it back.
   *
   * Confirmed on the way out but not on the way back in: hiding a live listing
   * is the consequential direction, and relisting something you took down is
   * plainly what you meant.
   */
  function handleToggleRented() {
    if (!listing || changingAvailability) return;

    const rented = listing.status?.listing === 'rented';

    async function apply() {
      if (!listing) return;
      setChangingAvailability(true);
      try {
        await setListingRented(listing.id, !rented);
        // Updated locally rather than refetched: one field changed and the
        // screen already knows everything else about this property.
        setListing({
          ...listing,
          status: { ...listing.status, listing: rented ? 'active' : 'rented' },
        });
      } catch (err: any) {
        Alert.alert('Could not change this listing', err?.message ?? 'Please try again.');
      } finally {
        setChangingAvailability(false);
      }
    }

    if (rented) {
      apply();
      return;
    }

    Alert.alert(
      'Mark as rented?',
      'Tenants will no longer find it in Browse. Nothing is deleted — your photographs, price and conversations stay, and you can put it back on the market at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark as rented', onPress: apply },
      ],
    );
  }

  /**
   * Deletes the owner's own property, behind two deliberate steps.
   *
   * One tap is not enough for something irreversible. The first screen is not a
   * confirmation at all — it is a statement of what disappears, named
   * specifically, because "are you sure?" asks a question the person cannot
   * answer without knowing the consequences. Only the second asks.
   *
   * Both steps put the destructive choice on the right and Cancel first, so the
   * habitual tap is the safe one.
   */
  function handleDelete() {
    if (!listing || !profile || deleting) return;

    const photoCount = listing.media?.photos?.length ?? 0;

    Alert.alert(
      `Delete ${listing.basicInfo.title}?`,
      [
        'This cannot be undone.',
        '',
        `• The listing is removed from Browse immediately${
          photoCount > 0 ? `\n• All ${photoCount} photographs are deleted` : ''
        }`,
        '• Anyone who saved it will no longer find it',
        '',
        'Conversations about this property are kept, so tenants who already messaged you can still reach you.',
      ].join('\n'),
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: confirmDelete },
      ],
    );
  }

  function confirmDelete() {
    if (!listing || !profile) return;

    Alert.alert(
      'Delete permanently?',
      'Last chance to change your mind.',
      [
        { text: 'Keep my listing', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteListing(profile.uid, listing.id);
              Alert.alert('Listing deleted', `${listing.basicInfo.title} has been removed.`, [
                { text: 'Done', onPress: () => navigation.goBack() },
              ]);
            } catch (err: any) {
              // Loudly: a half-failed delete leaves a property tenants can
              // still find, and an owner who believes it is gone.
              Alert.alert(
                'Could not delete the listing',
                err?.message ?? 'Please try again.',
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
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
    } catch (err: any) {
      // Said out loud. Swallowing this left the icon unchanged and no message,
      // so a tenant tapping Save saw nothing happen — and tapping again saw
      // nothing happen either, with no way to tell a failure from a dead
      // button.
      Alert.alert(
        'Could not save this property',
        err?.message ?? 'Check your connection and try again.',
      );
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

  /**
   * Whether this screen is being read by the person who owns the property.
   *
   * Either route can show a listing — a "both" account reaches its own property
   * from Browse as easily as from My properties — so ownership is the test, and
   * the stack only decides whether the wizard is reachable from here.
   */
  const viewingAsOwner = !!listing.ownerId && listing.ownerId === profile?.uid;
  const isRented = listing.status?.listing === 'rented';

  return (
    <ScrollView style={styles.wrapper} contentContainerStyle={styles.content}>
      {/* Said at the top, where an owner looks first. A listing that has quietly
          stopped appearing in Browse should never be a mystery to the person
          who took it down. */}
      {isRented && viewingAsOwner && (
        <View style={styles.rentedBanner}>
          <Text style={styles.rentedBannerText}>
            Rented — hidden from Browse. Your photographs and conversations are
            untouched.
          </Text>
        </View>
      )}

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
        {/* "Owner lives here" rather than "Owner on site", which reads like a
            construction notice. This is the question a Nigerian renter asks in
            plain words at every viewing, so it is asked in plain words here.

            Yes or No only. Publishing is blocked until the owner answers, so
            the sole way to reach this screen without a value is a listing
            written before the question existed — those show nothing rather
            than a third answer, and the fix for them is a data backfill, not
            a label. */}
        {listing.ownerOccupied !== undefined && (
          <Fact
            value={listing.ownerOccupied ? 'Yes' : 'No'}
            label="Owner lives here"
          />
        )}
      </Animated.View>

      {/*
        Shown to the owner in place of the savings breakdown, which is written
        for somebody deciding whether to rent and tells an owner nothing they
        do not know about their own price.

        Three plain numbers and no chart. An owner wants to know whether anybody
        is looking, and a graph of four data points would dress that up as more
        than it is.
      */}
      {viewingAsOwner ? (
        <View style={styles.stats}>
          <Text style={styles.statsHeading}>Interest so far</Text>
          {stats ? (
            <>
              <View style={styles.statsRow}>
                <Stat value={stats.views} label={stats.views === 1 ? 'viewer' : 'viewers'} />
                <Stat value={stats.saves} label={stats.saves === 1 ? 'save' : 'saves'} />
                <Stat
                  value={stats.enquiries}
                  label={stats.enquiries === 1 ? 'enquiry' : 'enquiries'}
                />
              </View>
              <Text style={styles.statsNote}>
                {stats.views === 0
                  ? 'Nobody has opened this listing yet. New properties take a few days to be found.'
                  : stats.enquiries === 0
                    ? 'People are looking but nobody has written yet. The photographs and the rent are what decide that.'
                    : 'Counted per person, not per visit.'}
              </Text>
            </>
          ) : (
            <Text style={styles.statsNote}>Counting…</Text>
          )}
        </View>
      ) : (
        <SavingsBreakdown annualRent={listing.pricing.annualRent} />
      )}

      {/* Shown to the owner too once a tour exists — checking what was shot
          before a tenant sees it is the only review they get. Without one it
          stays a tenant-facing promise, which an owner does not need. */}
      {/* A declined request shows a tenant nothing. The banner without a tour
          is a promise that one is coming, and on a property we have turned
          down that promise is simply false — the owner is told why below, and
          the tenant is told nothing rather than something untrue. */}
      {(listing.ownerId !== profile?.uid || !!listing.tour) &&
        !(listing.tourReview?.status === 'declined' && !listing.tour) && (
        <TourBanner
          tour={listing.tour}
          onOpen={
            listing.tour?.embedUrl
              ? () =>
                  navigation.navigate('Tour', {
                    embedUrl: listing.tour!.embedUrl,
                    title: listing.basicInfo.title,
                  })
              : undefined
          }
        />
      )}

      {/*
        The answer to the owner's request, on the owner's own listing.

        An owner who ticked the box and heard nothing assumes they were ignored.
        Every state gets a sentence, including the boring one — "nobody has
        looked yet" is information, and silence is not.

        Only the owner sees this. A tenant has no interest in our operational
        backlog, and "declined" on a public listing reads as something wrong
        with the property.
      */}
      {viewingAsOwner && !!listing.tourRequested && (
        <View style={styles.tourStatus}>
          <Text style={styles.tourStatusHeading}>Your 360 tour request</Text>
          {listing.tour ? (
            <Text style={styles.tourStatusBody}>
              Shot and live. Tenants can open it from this listing.
            </Text>
          ) : listing.tourReview?.status === 'declined' ? (
            <>
              <Text style={styles.tourStatusBody}>
                We are not able to shoot this one.
              </Text>
              {!!listing.tourReview.reason && (
                <Text style={styles.tourStatusReason}>
                  “{listing.tourReview.reason}”
                </Text>
              )}
              <Text style={styles.tourStatusBody}>
                Your listing is unaffected — it stays live with your own
                photographs.
              </Text>
            </>
          ) : listing.tourReview?.status === 'approved' ? (
            <Text style={styles.tourStatusBody}>
              Approved. We will be in touch to arrange a visit — have the
              property clean and tidy before we arrive.
            </Text>
          ) : (
            <Text style={styles.tourStatusBody}>
              Received. Nobody has looked at it yet — we will tell you either
              way.
            </Text>
          )}
        </View>
      )}

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
          {groupAmenities(listing.details.amenities).map((group, gi) => (
            <View key={group.label} style={styles.amenityGroup}>
              <Text style={styles.amenityGroupLabel}>{group.label}</Text>
              {group.items.map((amenity, i) => (
                <View key={amenity} style={styles.amenityRow}>
                  <AnimatedAmenityIcon
                    amenity={amenity}
                    group={group.label}
                    index={gi * 3 + i}
                  />
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
            </View>
          ))}
        </Animated.View>
      )}

      {/*
        Rules and availability, shown together because they are read together:
        somebody works out whether they are allowed to live here and whether
        they can move when they need to, in one pass.

        Hidden entirely for listings written before the wizard asked. An absent
        answer is not a permissive one, and inventing "Pets welcome" for a
        listing whose owner never said so would be a lie with a deposit
        attached.
      */}
      {(listing.rules || listing.availability) && (
        <Animated.View
          entering={FadeIn.duration(duration.quick)}
          style={styles.rules}
        >
          {!!listing.availability && (
            <>
              <Text style={styles.rulesHeading}>Availability</Text>
              <Text style={styles.ruleLine}>
                {AVAILABLE_FROM_LABELS[listing.availability.from]}
              </Text>
              <Text style={styles.ruleLine}>
                {MINIMUM_LEASE_LABELS[listing.availability.minimumLeaseMonths]}
              </Text>
            </>
          )}

          {!!listing.rules && (
            <>
              <Text style={styles.rulesHeading}>House rules</Text>
              <Text style={styles.ruleLine}>{PET_LABELS[listing.rules.pets]}</Text>
              <Text style={styles.ruleLine}>
                {SMOKING_LABELS[listing.rules.smoking]}
              </Text>
              {/* The examples carry this one. "No alterations" is a phrase
                  people agree to and breach the same week, because nobody
                  thinks of an air conditioner as an alteration until there is
                  a hole in the wall. */}
              <Text style={styles.ruleLine}>
                {ALTERATION_LABELS[listing.rules.alterations]}
              </Text>
              {listing.rules.alterations !== 'allowed' && (
                <Text style={styles.ruleNote}>{ALTERATION_NOTE}</Text>
              )}
              {!!listing.rules.houseRules && (
                <Text style={styles.ruleLine}>{listing.rules.houseRules}</Text>
              )}
            </>
          )}
        </Animated.View>
      )}

      <View style={styles.actions}>
        {/* The owner's own listing offers the one thing they came for.
            Until now a published listing could not be changed at all, so a
            wrong rent or a typo in the address stood for good. */}
        {canReachWizard && !!listing.ownerId && listing.ownerId === profile?.uid && (
          <Button
            label="Edit listing"
            variant="secondary"
            onPress={() => navigation.navigate('AddProperty', { draftId: listingId })}
            feedback="medium"
          />
        )}

        {/*
          One way in, not two.

          Enquiring and messaging were separate buttons that did nearly the
          same thing, so a tenant introduced themselves twice and an owner read
          the same person in two places. The enquiry answers are now how a
          conversation opens: once one exists, this goes straight to it.
        */}
        {/* Requires a known owner as well as it not being you. Without the
            first check a listing missing ownerId offers contact buttons that
            cannot possibly work.

            Owner-only accounts are excluded. Somebody registered solely as a
            property owner has no business opening a tenancy conversation with
            another owner — it is how a marketplace fills with people canvassing
            each other rather than housing anybody. An owner who genuinely wants
            to rent somewhere sets their role to Tenant & property owner, which
            takes one tap and is an honest statement of what they are doing.

            This is a product guardrail, not a security boundary, and the
            distinction matters: role lives on the user's own document and they
            can change it themselves. It shapes the default path rather than
            sealing it, which is the right weight for the problem. */}
        {!!listing.ownerId && listing.ownerId !== profile?.uid && profile?.role !== 'landlord' && (
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
        {/* Said plainly rather than leaving an owner staring at a listing with
            no way to act on it and no idea why. */}
        {!!listing.ownerId && listing.ownerId !== profile?.uid && profile?.role === 'landlord' && (
          <Text style={styles.ownerOnlyNote}>
            You are registered as a property owner. To enquire about somewhere to
            rent, change your role to Tenant &amp; property owner in Profile.
          </Text>
        )}

        {/*
          Saving and sharing are a tenant's tools and are hidden on your own
          property. Saving your own listing is a bookmark to something already
          in My properties, and a share sheet on it invites an owner to
          advertise elsewhere, which is the opposite of what the platform is
          for. Neither is useful, and an unused control is still something to
          read past.
        */}
        {!viewingAsOwner && (
          <>
            <View style={styles.actionSpacer} />
            <Button
              label={saved ? 'Saved' : 'Save property'}
              variant="secondary"
              icon={
                <AnimatedSaveIcon
                  saved={saved}
                  pulse={savePulse}
                  size={18}
                  color={colors.accentGold}
                />
              }
              onPress={handleToggleSave}
            />

            {/* Almost nobody rents alone here: the person who decides is often
                not the person browsing, so a property forwarded to a spouse or
                a parent is how the decision actually gets made. */}
            <View style={styles.actionSpacer} />
            <Button
              label="Share this property"
              variant="secondary"
              icon={<IconShare size={18} color={colors.accentGold} />}
              onPress={handleShare}
            />
          </>
        )}

        {/*
          Taking a property off the market sits above Delete, because it is what
          an owner almost always actually wants. Deleting to express "this one
          is let" throws away the photographs and the history with it.
        */}
        {viewingAsOwner && canReachWizard && (
          <>
            <View style={styles.actionSpacer} />
            <Button
              label={isRented ? 'Put back on the market' : 'Mark as rented'}
              variant="secondary"
              loading={changingAvailability}
              onPress={handleToggleRented}
            />
          </>
        )}

        {/*
          Deleting is last, and separated, because it is the one action here
          that cannot be undone.
        */}
        {viewingAsOwner && canReachWizard && (
          <>
            <View style={styles.actionSpacer} />
            <Button
              label="Delete listing"
              variant="secondary"
              loading={deleting}
              onPress={handleDelete}
            />
          </>
        )}
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

/** One figure and its noun. Gold, because these are the numbers worth reading. */
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
    fontSize: typography.sizes.sm,
  },
  actions: { marginTop: spacing.lg },
  actionSpacer: { height: spacing.sm },
  tourStatus: {
    backgroundColor: colors.backgroundPaper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  tourStatusHeading: {
    color: colors.accentGold,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.xs,
    letterSpacing: 0.6,
    marginBottom: spacing.xs,
  },
  tourStatusBody: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  /** The operator's own words, set apart so it reads as quoted, not as ours. */
  tourStatusReason: {
    color: colors.textPrimary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    marginVertical: spacing.xs,
  },
  rules: { marginTop: spacing.lg },
  rulesHeading: {
    color: colors.accentGold,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.xs,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  ruleLine: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginBottom: 6,
  },
  /**
   * The examples under the alterations rule. Muted because it elaborates the
   * line above rather than adding a fourth rule of its own.
   */
  ruleNote: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
    marginBottom: 6,
  },
  stats: {
    backgroundColor: colors.backgroundPaper,
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  statsHeading: {
    color: colors.accentGold,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.base,
    marginBottom: spacing.md,
  },
  statsRow: { flexDirection: 'row' },
  stat: { flex: 1 },
  statValue: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes.xl,
  },
  statLabel: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
  },
  statsNote: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    lineHeight: 18,
    marginTop: spacing.md,
  },
  rentedBanner: {
    backgroundColor: colors.backgroundPaper,
    borderLeftWidth: 3,
    borderLeftColor: colors.accentGold,
    borderRadius: radius.control,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  rentedBannerText: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    lineHeight: 21,
  },
  ownerOnlyNote: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
