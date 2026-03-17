import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import { ConversationService } from '../../../../packages/shared/src/services/conversation.service';
import type { Conversation } from '../../../../packages/shared/src/types/conversation';
import { EmptyState } from '../../../../packages/shared/src/components/EmptyState';
import type { RootState } from '../../store';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const SECONDARY = '#FF6F00';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const SURFACE = '#FFFFFF';
const BG = '#F5F7FA';
const SUCCESS = '#2E7D32';
const ERROR = '#C62828';

// ─── Types ────────────────────────────────────────────────────────────────────
interface EnrichedConversation extends Conversation {
  tenantName: string;
  tenantPhoto?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatRelativeTime(
  timestamp: { toDate: () => Date } | null | undefined
): string {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

function applicationStatusLabel(
  status: Conversation['applicationStatus']
): string | null {
  switch (status) {
    case 'pending': return 'Application Pending';
    case 'accepted': return 'Application Accepted';
    case 'rejected': return 'Application Rejected';
    default: return null;
  }
}

function applicationStatusColor(status: Conversation['applicationStatus']): string {
  switch (status) {
    case 'pending': return SECONDARY;
    case 'accepted': return SUCCESS;
    case 'rejected': return ERROR;
    default: return TEXT_SECONDARY;
  }
}

// ─── Conversation list item ───────────────────────────────────────────────────
interface ConversationItemProps {
  item: EnrichedConversation;
  uid: string;
  onPress: (conv: EnrichedConversation) => void;
}

function ConversationItem({ item, uid, onPress }: ConversationItemProps) {
  const unreadCount = item.unreadCount[uid] ?? 0;
  const hasUnread = unreadCount > 0;
  const appStatusLabel = applicationStatusLabel(item.applicationStatus);
  const appStatusColor = applicationStatusColor(item.applicationStatus);
  const lastMessagePreview = item.lastMessage?.text ?? '';
  const lastTime = item.lastMessage?.timestamp
    ? formatRelativeTime(item.lastMessage.timestamp)
    : item.updatedAt
    ? formatRelativeTime(item.updatedAt)
    : '';

  return (
    <TouchableOpacity
      style={[styles.convItem, hasUnread && styles.convItemUnread]}
      activeOpacity={0.8}
      onPress={() => onPress(item)}
    >
      {/* Avatar + unread badge */}
      <View style={styles.avatarWrap}>
        {item.tenantPhoto ? (
          <Image source={{ uri: item.tenantPhoto }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {item.tenantName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {hasUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.convContent}>
        <View style={styles.convTopRow}>
          <Text style={[styles.convTenantName, hasUnread && styles.convTenantNameBold]}>
            {item.tenantName}
          </Text>
          <Text style={styles.convTime}>{lastTime}</Text>
        </View>

        {item.propertyTitle && (
          <Text style={styles.convPropertyTitle} numberOfLines={1}>
            🏠 {item.propertyTitle}
          </Text>
        )}

        {lastMessagePreview.length > 0 && (
          <Text
            style={[styles.convPreview, hasUnread && styles.convPreviewBold]}
            numberOfLines={1}
          >
            {lastMessagePreview}
          </Text>
        )}

        {appStatusLabel && item.applicationStatus !== 'none' && (
          <View
            style={[
              styles.appStatusChip,
              { backgroundColor: appStatusColor + '1A', borderColor: appStatusColor },
            ]}
          >
            <Text style={[styles.appStatusText, { color: appStatusColor }]}>
              {appStatusLabel}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const uid = useSelector((state: RootState) => state.auth.uid);
  const router = useRouter();

  const [conversations, setConversations] = useState<EnrichedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Track enrichment to avoid stale overwrites
  const enrichmentCache = useRef<Record<string, { tenantName: string; tenantPhoto?: string; propertyTitle?: string; propertyPhoto?: string }>>({});

  const enrich = useCallback(
    async (convs: Conversation[]): Promise<EnrichedConversation[]> => {
      return Promise.all(
        convs.map(async (conv): Promise<EnrichedConversation> => {
          // Use cache to avoid re-fetching on every update
          if (!enrichmentCache.current[conv.id]) {
            const [tenantDoc, propDoc] = await Promise.all([
              firestore().collection('users').doc(conv.tenantId).get(),
              firestore().collection('properties').doc(conv.propertyId).get(),
            ]);

            const tenantData = tenantDoc.data() as
              | { firstName?: string; lastName?: string; photoUrl?: string }
              | undefined;
            const propData = propDoc.data() as
              | {
                  title?: string;
                  media?: { photos?: Array<{ url?: string; isPrimary?: boolean }> };
                }
              | undefined;

            const tenantName = tenantData
              ? `${tenantData.firstName ?? ''} ${tenantData.lastName ?? ''}`.trim() ||
                'Tenant'
              : 'Tenant';
            const tenantPhoto = tenantData?.photoUrl;

            const photos = propData?.media?.photos ?? [];
            const primaryPhoto = photos.find(p => p.isPrimary) ?? photos[0];

            enrichmentCache.current[conv.id] = {
              tenantName,
              tenantPhoto,
              propertyTitle: propData?.title,
              propertyPhoto: primaryPhoto?.url,
            };
          }

          const cached = enrichmentCache.current[conv.id];

          return {
            ...conv,
            tenantName: cached.tenantName,
            tenantPhoto: cached.tenantPhoto,
            otherPartyName: cached.tenantName,
            otherPartyPhoto: cached.tenantPhoto,
            propertyTitle: cached.propertyTitle ?? conv.propertyTitle,
            propertyPhoto: cached.propertyPhoto ?? conv.propertyPhoto,
          };
        })
      );
    },
    []
  );

  // Real-time subscription
  useEffect(() => {
    if (!uid) return;

    const unsubscribe = ConversationService.subscribeToConversations(
      uid,
      'landlord',
      async (rawConversations) => {
        try {
          const enriched = await enrich(rawConversations);
          setConversations(enriched);
        } catch {
          // keep previous state on enrichment error
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [uid, enrich]);

  const handleRefresh = useCallback(() => {
    // Clear enrichment cache so we re-fetch on manual refresh
    enrichmentCache.current = {};
    setRefreshing(true);
    // Subscription will auto-update; just flip refreshing off after a moment
    // if no snapshot fires we time-out gracefully
    const timeout = setTimeout(() => setRefreshing(false), 5000);
    return () => clearTimeout(timeout);
  }, []);

  const handlePress = useCallback(
    (conv: EnrichedConversation) => {
      router.push(`/chat/${conv.id}` as never);
    },
    [router]
  );

  const totalUnread = conversations.reduce(
    (sum, c) => sum + (c.unreadCount[uid ?? ''] ?? 0),
    0
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading conversations…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        {totalUnread > 0 && (
          <View style={styles.unreadHeaderBadge}>
            <Text style={styles.unreadHeaderBadgeText}>
              {totalUnread > 99 ? '99+' : totalUnread} unread
            </Text>
          </View>
        )}
      </View>

      {/* List */}
      <FlatList
        data={conversations}
        keyExtractor={item => item.id}
        contentContainerStyle={
          conversations.length === 0 ? styles.emptyContainer : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[PRIMARY]}
            tintColor={PRIMARY}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="💬"
            title="No conversations yet"
            message="Tenant messages will appear here once they contact you."
          />
        }
        renderItem={({ item }) => (
          <ConversationItem
            item={item}
            uid={uid ?? ''}
            onPress={handlePress}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: TEXT_SECONDARY },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: TEXT_COLOR },
  unreadHeaderBadge: {
    marginLeft: 10,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  unreadHeaderBadgeText: { fontSize: 12, fontWeight: '700', color: '#FFF' },

  listContent: { paddingBottom: 24 },
  emptyContainer: { flexGrow: 1 },
  separator: { height: 1, backgroundColor: BORDER, marginLeft: 74 },

  convItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: SURFACE,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  convItemUnread: { backgroundColor: PRIMARY_LIGHT },

  avatarWrap: { position: 'relative', marginRight: 12, flexShrink: 0 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#C8E6C9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: PRIMARY },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: ERROR,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: SURFACE,
  },
  unreadBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFF' },

  convContent: { flex: 1 },
  convTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  convTenantName: { fontSize: 15, fontWeight: '500', color: TEXT_COLOR },
  convTenantNameBold: { fontWeight: '700' },
  convTime: { fontSize: 12, color: TEXT_SECONDARY },
  convPropertyTitle: { fontSize: 12, color: TEXT_SECONDARY, marginBottom: 2 },
  convPreview: { fontSize: 13, color: TEXT_SECONDARY, marginBottom: 4 },
  convPreviewBold: { color: TEXT_COLOR, fontWeight: '600' },

  appStatusChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 2,
  },
  appStatusText: { fontSize: 10, fontWeight: '700' },
});
