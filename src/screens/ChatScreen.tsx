import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { duration } from '../theme/motion';
import { useAuth } from '../context/AuthContext';
import {
  fetchConversation,
  markConversationRead,
  sendMessage,
  subscribeToMessages,
} from '../services/messages';
import type { Conversation, Message } from '../types';

interface Props {
  route: { params: { conversationId: string } };
}

/**
 * The direct line, made literal.
 *
 * Property context stays pinned at the top rather than scrolling away with the
 * first messages: two people three weeks into a conversation still need to
 * know which flat they are arguing about the water supply in.
 */
export default function ChatScreen({ route }: Props) {
  const { conversationId } = route.params;
  const { profile } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    let active = true;

    fetchConversation(conversationId)
      .then(result => {
        if (!active) return;
        setConversation(result);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    const unsubscribe = subscribeToMessages(conversationId, next => {
      if (active) setMessages(next);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [conversationId]);

  // Opening the thread is what marks it read — not receiving the message.
  useEffect(() => {
    if (!profile) return;
    markConversationRead(conversationId, profile.uid).catch(() => {});
  }, [conversationId, profile, messages.length]);

  async function handleSend() {
    if (!profile || !conversation || sending) return;
    const text = draft.trim();
    if (!text) return;

    setSending(true);
    setDraft(''); // Cleared first so the field feels instant on a slow connection.

    try {
      await sendMessage(conversation, profile.uid, text);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } catch {
      setDraft(text); // Put it back rather than losing what they typed.
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ActivityIndicator color={colors.accentGold} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!conversation || !profile) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Text style={styles.missing}>This conversation is no longer available.</Text>
      </SafeAreaView>
    );
  }

  const otherName =
    profile.uid === conversation.landlordId ? conversation.tenantName : conversation.landlordName;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.context}>
          <Text style={styles.contextName}>{otherName}</Text>
          <Text style={styles.contextProperty} numberOfLines={1}>
            {conversation.listingTitle} · {conversation.listingArea}
          </Text>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No messages yet. Ask about the property — you are talking to the owner directly.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const mine = item.senderId === profile.uid;
            return (
              <Animated.View
                entering={FadeIn.duration(duration.quick)}
                style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}
              >
                <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
                    {item.text}
                  </Text>
                  <Text style={[styles.time, mine && styles.timeMine]}>
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
              </Animated.View>
            );
          }}
        />

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a message"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            multiline
            maxLength={1000}
          />
          <Pressable
            onPress={handleSend}
            disabled={!draft.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={({ pressed }) => [
              styles.send,
              (!draft.trim() || sending) && styles.sendDisabled,
              pressed && styles.sendPressed,
            ]}
          >
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Short clock time — the date lives in the conversation list, not every bubble. */
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  loader: { marginTop: spacing.xl },
  missing: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  context: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contextName: {
    color: colors.textPrimary,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.lg,
  },
  contextProperty: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  list: { padding: spacing.lg, flexGrow: 1 },
  empty: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  emptyText: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing.sm },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  bubbleMine: { backgroundColor: colors.accentGold, borderBottomRightRadius: radius.sm },
  bubbleTheirs: {
    backgroundColor: colors.backgroundPaper,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: radius.sm,
  },
  bubbleText: {
    color: colors.textPrimary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    lineHeight: 22,
  },
  bubbleTextMine: { color: colors.primaryDark },
  time: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeMine: { color: 'rgba(26,10,10,0.55)' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    color: colors.textPrimary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    backgroundColor: colors.backgroundPaper,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  send: {
    marginLeft: spacing.sm,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentCoral,
  },
  sendDisabled: { opacity: 0.4 },
  sendPressed: { opacity: 0.85 },
  sendText: {
    color: colors.textPrimary,
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.sm,
  },
});
