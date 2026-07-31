import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { duration, easing, stagger } from '../theme/motion';
import EmptyState from '../components/EmptyState';
import { subscribeToConversations } from '../services/messages';
import { useAuth } from '../context/AuthContext';
import type { Conversation } from '../types';

export default function MessagesScreen() {
  const { profile } = useAuth();
  const navigation = useNavigation<any>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }

    // Live rather than fetch-on-focus: an owner sitting on this screen should
    // see a tenant's message land without pulling to refresh.
    const unsubscribe = subscribeToConversations(
      profile.uid,
      next => {
        setConversations(next);
        setError('');
        setLoading(false);
      },
      () => {
        // Something must be shown. A listener that fails leaves this screen
        // spinning indefinitely otherwise, which reads as the app hanging.
        setError('Messages are unavailable right now. Check your connection and try again.');
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [profile]);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ActivityIndicator color={colors.accentGold} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Text style={styles.heading}>Messages</Text>

      <FlatList
        data={conversations}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          error ? (
            <EmptyState variant="noMatch" title="Cannot load messages" body={error} />
          ) : (
            <EmptyState
              variant="empty"
              title="No conversations yet"
              body="Message a property owner from any listing and the conversation appears here."
            />
          )
        }
        renderItem={({ item, index }) => {
          const unread = profile ? (item.unread?.[profile.uid] ?? 0) : 0;
          const otherName =
            profile?.uid === item.landlordId ? item.tenantName : item.landlordName;

          return (
            <Animated.View
              entering={FadeInDown.delay(stagger(index))
                .duration(duration.normal)
                .easing(easing.out)}
            >
              <Pressable
                onPress={() => navigation.navigate('Chat', { conversationId: item.id })}
                accessibilityRole="button"
                accessibilityLabel={`Conversation with ${otherName}`}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.rowTop}>
                  <Text style={styles.name} numberOfLines={1}>
                    {otherName}
                  </Text>
                  {unread > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unread}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.property} numberOfLines={1}>
                  {item.listingTitle} · {item.listingArea}
                </Text>

                <Text
                  style={[styles.preview, unread > 0 && styles.previewUnread]}
                  numberOfLines={1}
                >
                  {item.lastMessage || 'No messages yet'}
                </Text>
              </Pressable>
            </Animated.View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loader: { marginTop: spacing.xl },
  heading: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['2xl'],
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, flexGrow: 1 },
  row: {
    backgroundColor: colors.backgroundPaper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowPressed: { opacity: 0.85 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.base,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentCoral,
    marginLeft: spacing.sm,
  },
  badgeText: {
    color: colors.textPrimary,
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.xs,
  },
  property: {
    color: colors.accentGold,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  preview: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  previewUnread: { color: colors.textPrimary },
});
