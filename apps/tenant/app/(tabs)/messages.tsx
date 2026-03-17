import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import { RootState } from '../../store';
import { ConversationService } from '../../../../packages/shared/src/services/conversation.service';
import type { Conversation } from '../../../../packages/shared/src/types/conversation';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const SECONDARY = '#FF6F00';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const SURFACE = '#FFFFFF';
const BG = '#F5F7FA';


// ─── Types ────────────────────────────────────────────────────────────────────
interface LandlordInfo {
  name: string;
  photoUrl: string | null;
}

interface PropertyInfo {
  title: string;
  photoUrl: string | null;
}

type EnrichedConversation = Conversation & {
  landlordInfo: LandlordInfo;
  propInfo: PropertyInfo;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRelativeTime(timestamp: { seconds: number; nanoseconds: number }): string {
  const msNow = Date.now();
  const msTs = timestamp.seconds * 1000;
  const diffMs = msNow - msTs;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  const d = new Date(msTs);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function getApplicationStatusLabel(
  status: Conversation['applicationStatus']
): string | null {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'accepted':
      return 'Accepted ✓';
    case 'rejected':
      return 'Rejected';
    default:
      return null;
  }
}

function getApplicationStatusColor(
  status: Conversation['applicationStatus']
): string {
  switch (status) {
    case 'pending':
      return SECONDARY;
    case 'accepted':
      return PRIMARY;
    case 'rejected':
      return '#C62828';
    default:
      return TEXT_SECONDARY;
  }
}

// ─── Conversation Item ────────────────────────────────────────────────────────
function ConversationItem({
  item,
  uid,
}: {
  item: EnrichedConversation;
  uid: string;
}) {
  const unreadCount = item.unreadCount?.[uid] ?? 0;
  const lastMsg = item.lastMessage;
  const appStatusLabel = getApplicationStatusLabel(item.applicationStatus);
  const appStatusColor = getApplicationStatusColor(item.applicationStatus);

  return (
    <TouchableOpacity
      style={styles.convoItem}
      activeOpacity={0.8}
      onPress={() => router.push(`/chat/${item.id}`)}
    >
      {/* Avatar + unread badge */}
      <View style={styles.avatarWrapper}>
        {item.landlordInfo.photoUrl ? (
          <Image
            source={{ uri: item.landlordInfo.photoUrl }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarPlaceholderText}>
              {item.landlordInfo.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {unreadCount > 99 ? '99+' : String(unreadCount)}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.convoContent}>
        <View style={styles.convoTopRow}>
          <Text
            style={[styles.landlordName, unreadCount > 0 && styles.landlordNameBold]}
            numberOfLines={1}
          >
            {item.landlordInfo.name}
          </Text>
          {lastMsg ? (
            <Text style={styles.timeText}>{getRelativeTime(lastMsg.timestamp)}</Text>
          ) : null}
        </View>

        <Text style={styles.propertyTitle} numberOfLines={1}>
          {item.propInfo.title}
        </Text>

        {lastMsg ? (
          <Text
            style={[styles.lastMessage, unreadCount > 0 && styles.lastMessageBold]}
            numberOfLines={1}
          >
            {lastMsg.text}
          </Text>
        ) : (
          <Text style={styles.noMessages}>No messages yet</Text>
        )}

        {appStatusLabel !== null && (
          <View
            style={[
              styles.appStatusChip,
              { backgroundColor: appStatusColor + '1A' },
            ]}
          >
            <Text style={[styles.appStatusChipText, { color: appStatusColor }]}>
              {appStatusLabel}
            </Text>
          </View>
        )}
      </View>

      {/* Right: unread indicator or checkmark */}
      <View style={styles.convoRight}>
        {unreadCount > 0 ? (
          <View style={styles.unreadDot} />
        ) : (
          <Text style={styles.readCheck}>✓</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💬</Text>
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptyMessage}>
        Message landlords directly from any property listing.
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const uid = useSelector((state: RootState) => state.auth.uid);

  const [conversations, setConversations] = useState<EnrichedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Caches to avoid re-fetching known landlords/properties
  const landlordCache = useRef<Record<string, LandlordInfo>>({});
  const propertyCache = useRef<Record<string, PropertyInfo>>({});

  const enrichConversations = useCallback(
    async (rawConvos: Conversation[]): Promise<EnrichedConversation[]> => {
      // Collect unique landlord IDs and property IDs not yet in cache
      const unknownLandlordIds = [
        ...new Set(
          rawConvos
            .map(c => c.landlordId)
            .filter(id => !landlordCache.current[id])
        ),
      ];
      const unknownPropertyIds = [
        ...new Set(
          rawConvos
            .map(c => c.propertyId)
            .filter(id => !propertyCache.current[id])
        ),
      ];

      // Batch fetch landlords
      await Promise.all(
        unknownLandlordIds.map(async landlordId => {
          try {
            const doc = await firestore().collection('users').doc(landlordId).get();
            if (doc.exists) {
              const data = doc.data() as {
                firstName?: string;
                lastName?: string;
                photoUrl?: string;
              };
              landlordCache.current[landlordId] = {
                name: [data.firstName, data.lastName].filter(Boolean).join(' ') || 'Landlord',
                photoUrl: data.photoUrl ?? null,
              };
            } else {
              landlordCache.current[landlordId] = { name: 'Landlord', photoUrl: null };
            }
          } catch {
            landlordCache.current[landlordId] = { name: 'Landlord', photoUrl: null };
          }
        })
      );

      // Batch fetch properties
      await Promise.all(
        unknownPropertyIds.map(async propertyId => {
          try {
            const doc = await firestore()
              .collection('properties')
              .doc(propertyId)
              .get();
            if (doc.exists) {
              const data = doc.data() as {
                title?: string;
                media?: { photos?: Array<{ url?: string; isPrimary?: boolean }> };
              };
              const photos = data.media?.photos ?? [];
              const primary = photos.find(p => p.isPrimary);
              propertyCache.current[propertyId] = {
                title: data.title ?? 'Property',
                photoUrl: primary?.url ?? photos[0]?.url ?? null,
              };
            } else {
              propertyCache.current[propertyId] = {
                title: 'Property',
                photoUrl: null,
              };
            }
          } catch {
            propertyCache.current[propertyId] = { title: 'Property', photoUrl: null };
          }
        })
      );

      return rawConvos.map(c => ({
        ...c,
        landlordInfo: landlordCache.current[c.landlordId] ?? {
          name: 'Landlord',
          photoUrl: null,
        },
        propInfo: propertyCache.current[c.propertyId] ?? {
          title: 'Property',
          photoUrl: null,
        },
      }));
    },
    []
  );

  // Real-time subscription
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const subscribe = useCallback(() => {
    if (!uid) return;
    setLoading(true);

    unsubscribeRef.current = ConversationService.subscribeToConversations(
      uid,
      'tenant',
      async (rawConvos: Conversation[]) => {
        const enriched = await enrichConversations(rawConvos);
        setConversations(enriched);
        setLoading(false);
        setRefreshing(false);
      }
    );
  }, [uid, enrichConversations]);

  useEffect(() => {
    subscribe();
    return () => {
      unsubscribeRef.current?.();
    };
  }, [subscribe]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Unsubscribe and re-subscribe to force a fresh pull
    unsubscribeRef.current?.();
    subscribe();
  }, [subscribe]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        {conversations.length > 0 && (
          <Text style={styles.headerCount}>{conversations.length}</Text>
        )}
      </View>

      <FlatList
        data={conversations}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ConversationItem item={item} uid={uid ?? ''} />
        )}
        contentContainerStyle={[
          styles.listContent,
          conversations.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={<EmptyState />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SURFACE,
    paddingTop: 8,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_COLOR,
  },
  headerCount: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  listContent: {
    paddingVertical: 8,
  },
  listContentEmpty: {
    flex: 1,
  },
  itemSeparator: {
    height: 1,
    backgroundColor: BORDER,
    marginLeft: 72,
  },
  // Conversation item
  convoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: SURFACE,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
    width: 48,
    height: 48,
    flexShrink: 0,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PRIMARY_LIGHT,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 20,
    fontWeight: '700',
    color: PRIMARY,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#C62828',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: SURFACE,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: SURFACE,
  },
  convoContent: {
    flex: 1,
    minWidth: 0,
  },
  convoTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  landlordName: {
    fontSize: 15,
    fontWeight: '500',
    color: TEXT_COLOR,
    flex: 1,
  },
  landlordNameBold: {
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginLeft: 8,
    flexShrink: 0,
  },
  propertyTitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginBottom: 6,
  },
  lastMessageBold: {
    fontWeight: '600',
    color: TEXT_COLOR,
  },
  noMessages: {
    fontSize: 13,
    color: BORDER,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  appStatusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  appStatusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  convoRight: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    flexShrink: 0,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY,
  },
  readCheck: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
  },
});
