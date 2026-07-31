import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { duration, easing, stagger } from '../theme/motion';
import EmptyState from '../components/EmptyState';
import { formatNaira } from '../lib/format';
import {
  fetchMyApplications,
  fetchReceivedApplications,
  setApplicationStatus,
  MOVE_IN_LABELS,
  LEASE_LABELS,
  STATUS_LABELS,
} from '../services/applications';
import { ensureConversationFromApplication } from '../services/messages';
import { IconMessages } from '../components/icons/Icon';
import { useAuth } from '../context/AuthContext';
import type { Application, ApplicationStatus } from '../types';

const STATUS_COLOUR: Record<ApplicationStatus, string> = {
  pending: colors.warning,
  accepted: colors.success,
  declined: colors.textMuted,
  withdrawn: colors.textMuted,
};

type Tab = 'sent' | 'received';

export default function EnquiriesScreen() {
  const { profile } = useAuth();
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<Tab>('sent');
  const [sent, setSent] = useState<Application[]>([]);
  const [received, setReceived] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const isLandlord = profile?.role === 'landlord' || profile?.role === 'both';
  const isTenant = profile?.role === 'tenant' || profile?.role === 'both';

  // An owner-only account has nothing in "sent", so open on what they have.
  React.useEffect(() => {
    if (!isTenant && isLandlord) setTab('received');
  }, [isTenant, isLandlord]);

  /**
   * Opens the thread for an enquiry.
   *
   * The owner's name is only knowable when the owner is the one tapping;
   * a tenant opening from here falls back until the thread already exists, at
   * which point the stored name is used.
   */
  async function openConversation(application: Application) {
    if (!profile) return;
    try {
      const conversation = await ensureConversationFromApplication(
        application,
        profile.uid === application.landlordId ? profile.fullName : 'The property owner',
      );
      navigation.navigate('Messages', {
        screen: 'Chat',
        params: { conversationId: conversation.id },
      });
    } catch {
      // Non-fatal — the list stays put and the tap can be repeated.
    }
  }

  const load = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }
    try {
      const [mine, theirs] = await Promise.all([
        isTenant ? fetchMyApplications(profile.uid) : Promise.resolve([]),
        isLandlord ? fetchReceivedApplications(profile.uid) : Promise.resolve([]),
      ]);
      setSent(mine);
      setReceived(theirs);
    } catch {
      setSent([]);
      setReceived([]);
    }
    setLoading(false);
  }, [profile, isTenant, isLandlord]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function respond(application: Application, status: ApplicationStatus) {
    try {
      await setApplicationStatus(application.id, status);
      await load();
    } catch {
      Alert.alert('Could not update', 'Please try again.');
    }
  }

  const data = tab === 'sent' ? sent : received;
  const showTabs = isTenant && isLandlord;

  return (
    <SafeAreaView style={styles.wrapper} edges={['left', 'right']}>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.heading}>Enquiries</Text>

            {showTabs && (
              <View style={styles.tabs}>
                <TabButton
                  label={`Sent${sent.length ? ` (${sent.length})` : ''}`}
                  active={tab === 'sent'}
                  onPress={() => setTab('sent')}
                />
                <TabButton
                  label={`Received${received.length ? ` (${received.length})` : ''}`}
                  active={tab === 'received'}
                  onPress={() => setTab('received')}
                />
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          loading ? null : tab === 'sent' ? (
            <EmptyState
              variant="empty"
              title="No enquiries yet"
              body="When you enquire about a property, it appears here with the property owner's reply."
            />
          ) : (
            <EmptyState
              variant="empty"
              title="No enquiries received"
              body="When a tenant enquires about one of your properties, it appears here."
            />
          )
        }
        renderItem={({ item, index }) => (
          <ApplicationRow
            application={item}
            index={index}
            asLandlord={tab === 'received'}
            onRespond={respond}
            onMessage={openConversation}
          />
        )}
      />
    </SafeAreaView>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ApplicationRow({
  application,
  index,
  asLandlord,
  onRespond,
  onMessage,
}: {
  application: Application;
  index: number;
  asLandlord: boolean;
  onRespond: (a: Application, status: ApplicationStatus) => void;
  onMessage: (a: Application) => void;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(stagger(index)).duration(duration.normal).easing(easing.out)}
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {application.listingTitle}
        </Text>
        <View style={[styles.badge, { borderColor: STATUS_COLOUR[application.status] }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLOUR[application.status] }]}>
            {STATUS_LABELS[application.status]}
          </Text>
        </View>
      </View>

      <Text style={styles.cardMeta}>
        {application.listingArea} · {formatNaira(application.annualRent)}/year
      </Text>

      {asLandlord && (
        <Text style={styles.from}>
          From {application.tenantName} · {application.tenantEmail}
        </Text>
      )}

      <View style={styles.facts}>
        <Text style={styles.fact}>{MOVE_IN_LABELS[application.moveIn]}</Text>
        <Text style={styles.fact}>{LEASE_LABELS[application.leaseMonths]}</Text>
        <Text style={styles.fact}>
          {application.occupants} {application.occupants === 1 ? 'occupant' : 'occupants'}
        </Text>
      </View>

      <Text style={styles.message}>{application.message}</Text>

      {/* Available whatever the status: a declined enquiry is often the start
          of a conversation about a different property. */}
      <Pressable
        onPress={() => onMessage(application)}
        accessibilityRole="button"
        accessibilityLabel={
          asLandlord ? `Message ${application.tenantName}` : 'Message property owner'
        }
        style={({ pressed }) => [styles.messageAction, pressed && styles.messageActionPressed]}
      >
        <IconMessages size={15} color={colors.accentGold} />
        <Text style={styles.messageActionText}>
          {asLandlord ? `Message ${application.tenantName.split(' ')[0]}` : 'Message property owner'}
        </Text>
      </Pressable>

      {asLandlord && application.status === 'pending' && (
        <View style={styles.actions}>
          <Pressable
            onPress={() => onRespond(application, 'accepted')}
            accessibilityRole="button"
            style={[styles.action, styles.accept]}
          >
            <Text style={styles.acceptText}>Accept</Text>
          </Pressable>
          <Pressable
            onPress={() => onRespond(application, 'declined')}
            accessibilityRole="button"
            style={[styles.action, styles.decline]}
          >
            <Text style={styles.declineText}>Decline</Text>
          </Pressable>
        </View>
      )}

      {!asLandlord && application.status === 'accepted' && (
        <Text style={styles.accepted}>
          The property owner accepted your enquiry. They will be in touch at{' '}
          {application.tenantEmail}.
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, flexGrow: 1 },
  header: { marginBottom: spacing.md },
  heading: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['2xl'],
  },
  tabs: { flexDirection: 'row', marginTop: spacing.md },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  tabActive: { borderColor: colors.accentGold, backgroundColor: colors.backgroundElevated },
  tabText: {
    color: colors.textSecondary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
  },
  tabTextActive: { color: colors.accentGold },
  card: {
    backgroundColor: colors.backgroundPaper,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.base,
    paddingRight: spacing.sm,
  },
  badge: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  badgeText: {
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.xs,
  },
  cardMeta: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  from: {
    color: colors.accentGold,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.xs,
    marginTop: spacing.sm,
  },
  facts: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm },
  fact: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.sm,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  message: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  messageAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: radius.sm,
  },
  messageActionPressed: { opacity: 0.85 },
  messageActionText: {
    color: colors.accentGold,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.xs,
    marginLeft: spacing.xs,
  },
  actions: { flexDirection: 'row', marginTop: spacing.md },
  action: {
    flex: 1,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accept: { backgroundColor: colors.successDark, marginRight: spacing.sm },
  acceptText: {
    color: colors.textPrimary,
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.sm,
  },
  decline: { borderWidth: 1, borderColor: colors.border },
  declineText: {
    color: colors.textSecondary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
  },
  accepted: {
    color: colors.successLight,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
    marginTop: spacing.md,
  },
});
