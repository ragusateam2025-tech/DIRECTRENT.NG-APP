import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { tidyMessage } from '../lib/text';
import { refineText } from '../services/refine';
import { colors, typography, spacing, radius } from '../theme/tokens';
import { duration } from '../theme/motion';
import { useAuth } from '../context/AuthContext';
import {
  fetchConversation,
  markConversationRead,
  sendMessage,
  subscribeToMessages,
} from '../services/messages';
import { setApplicationStatus } from '../services/applications';
import Button from '../components/Button';
import type { ApplicationStatus, Conversation, Message } from '../types';

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
  // Typed loosely because this screen is registered in three stacks and only
  // needs one route from each of them.
  const navigation = useNavigation<any>();
  const [polishing, setPolishing] = useState(false);
  /**
   * The suggestion, held above the composer rather than dropped into it.
   *
   * Same bargain as the enquiry form: an owner reads how somebody writes, and
   * silently replacing that hands every tenant the same voice — then leaves
   * them to meet a landlord expecting the person in the message.
   */
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState<ApplicationStatus | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  /**
   * Accepts or declines the enquiry this thread opened with.
   *
   * The application and the conversation share an id — both are built from the
   * listing and the tenant — so the decision needs nothing this screen does not
   * already have.
   */
  async function decide(status: ApplicationStatus) {
    if (!conversation || deciding) return;

    setDeciding(status);
    try {
      await setApplicationStatus(conversation.id, status);
      setConversation({ ...conversation, applicationStatus: status });
    } catch (e: any) {
      Alert.alert('Could not save that', e?.message ?? String(e));
    } finally {
      setDeciding(null);
    }
  }

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

    const unsubscribe = subscribeToMessages(
      conversationId,
      next => {
        if (active) setMessages(next);
      },
      () => {
        // The thread stays on screen with whatever already arrived; only the
        // loading state is released so it cannot hang.
        if (active) setLoading(false);
      },
    );

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

  async function handlePolish() {
    if (polishing) return;
    setPolishing(true);
    try {
      setSuggestion(await refineText(draft, 'tenant'));
    } catch (e: any) {
      Alert.alert('Could not polish that', e?.message ?? String(e));
    } finally {
      setPolishing(false);
    }
  }

  async function handleSend() {
    if (!profile || !conversation || sending) return;
    // Tidied on send, never as they type. Rewriting a sentence under somebody's
    // cursor mid-word is the behaviour people switch autocorrect off to escape.
    // This only touches spacing and capitals, and it leaves a short shout as
    // typed -- in conversation "NO" means something "No" does not.
    const text = tidyMessage(draft);
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
  const isOwner = profile.uid === conversation.landlordId;

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

        {/*
          The decision, where the conversation is.

          Accepting and declining used to live on a separate Enquiries tab, so
          an owner read someone's message in one place and answered them in
          another. It belongs here: the thread is the enquiry, and the decision
          is a reply to it.

          Only the owner sees the buttons, and only while it is undecided.
        */}
        {isOwner && conversation.applicationStatus === 'pending' && (
          <View style={styles.decision}>
            <Text style={styles.decisionText}>
              {conversation.tenantName} is asking about this property.
            </Text>
            <View style={styles.decisionButtons}>
              <View style={styles.decisionButton}>
                <Button
                  label="Accept"
                  loading={deciding === 'accepted'}
                  onPress={() => decide('accepted')}
                />
              </View>
              <View style={styles.decisionButton}>
                <Button
                  label="Decline"
                  variant="secondary"
                  loading={deciding === 'declined'}
                  onPress={() => decide('declined')}
                />
              </View>
            </View>
          </View>
        )}

        {/* Both parties see the outcome. A tenant whose enquiry was declined
            should not have to infer it from silence. */}
        {conversation.applicationStatus === 'accepted' && (
          <>
            <Text style={[styles.outcome, styles.outcomeGood]}>Enquiry accepted</Text>
            {/* Offered only once both sides have agreed. Before that there is
                nothing to write an agreement about, and putting the button
                there earlier would invite somebody to send a tenancy to a
                stranger who has not said yes. */}
            <View style={styles.agreement}>
              <Button
                label="Prepare tenancy agreement"
                variant="secondary"
                onPress={() =>
                  navigation.navigate('Agreement', { conversationId: conversation.id })
                }
              />
            </View>
          </>
        )}
        {conversation.applicationStatus === 'declined' && (
          <Text style={styles.outcome}>Enquiry declined</Text>
        )}

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
          {/* Above the composer, and only for the tenant. The owner prompt is
              written for listing copy and would be wrong here; the tenant one
              is written for exactly this message. */}
          {!isOwner && draft.trim().length >= 20 && !suggestion && (
            <Button
              label={polishing ? 'Polishing…' : 'Polish message'}
              variant="secondary"
              onPress={handlePolish}
              loading={polishing}
            />
          )}

          {!!suggestion && (
            <View style={styles.suggestion}>
              <Text style={styles.suggestionHeading}>A suggested rewrite</Text>
              <Text style={styles.suggestionBody}>{suggestion}</Text>
              <View style={styles.suggestionActions}>
                <Button
                  label="Use this"
                  variant="secondary"
                  onPress={() => {
                    setDraft(suggestion);
                    setSuggestion(null);
                  }}
                />
                <View style={styles.suggestionSpacer} />
                <Button
                  label="Keep mine"
                  variant="secondary"
                  onPress={() => setSuggestion(null)}
                />
              </View>
            </View>
          )}

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
  decision: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundPaper,
  },
  decisionText: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginBottom: spacing.sm,
  },
  agreement: { marginTop: spacing.sm },
  suggestion: {
    backgroundColor: colors.backgroundPaper,
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  suggestionHeading: {
    color: colors.accentGold,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.xs,
    marginBottom: spacing.xs,
  },
  suggestionBody: {
    color: colors.textPrimary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    lineHeight: 21,
  },
  suggestionActions: { flexDirection: 'row', marginTop: spacing.sm },
  suggestionSpacer: { width: spacing.sm },
  decisionButtons: { flexDirection: 'row' },
  decisionButton: { flex: 1, marginRight: spacing.sm },
  outcome: {
    color: colors.textMuted,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  outcomeGood: { color: colors.success },
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
