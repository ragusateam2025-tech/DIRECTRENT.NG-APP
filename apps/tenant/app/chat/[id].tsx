import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import type { RootState } from '../../store';
import { ConversationService } from '../../../../packages/shared/src/services/conversation.service';
import type { Conversation, Message } from '../../../../packages/shared/src/types/conversation';

const PRIMARY = '#1B5E20';
const PRIMARY_LIGHT = '#E8F5E9';
const TEXT_COLOR = '#212121';
const TEXT_SECONDARY = '#757575';
const BORDER = '#E0E0E0';
const SURFACE = '#FFFFFF';
const BG = '#F5F7FA';
const SUCCESS = '#2E7D32';

function formatMessageTime(timestamp: { toDate: () => Date } | null | undefined): string {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  const m = minutes.toString().padStart(2, '0');
  return `${h}:${m} ${ampm}`;
}

function formatSectionDate(timestamp: { toDate: () => Date } | null | undefined): string {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function shouldShowTimestamp(messages: Message[], index: number): boolean {
  if (index === 0) return true;
  if (index % 5 === 0) return true;

  const current = messages[index];
  const previous = messages[index - 1];

  if (!current.createdAt || !previous.createdAt) return false;

  const currentTime = current.createdAt.toDate().getTime();
  const previousTime = previous.createdAt.toDate().getTime();
  const diffMinutes = (currentTime - previousTime) / (1000 * 60);

  return diffMinutes > 5;
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showTimestamp: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn, showTimestamp }) => {
  const text = message.content.text ?? '';

  return (
    <View style={[styles.bubbleWrapper, isOwn ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft]}>
      {showTimestamp && (
        <Text style={styles.timestampLabel}>
          {formatSectionDate(message.createdAt)} {formatMessageTime(message.createdAt)}
        </Text>
      )}
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleTheirs]}>
        {message.type === 'system' || message.type === 'application_update' ? (
          <View style={styles.systemMessageContainer}>
            <Text style={styles.systemMessageText}>{text}</Text>
          </View>
        ) : (
          <Text style={[styles.bubbleText, isOwn ? styles.bubbleTextOwn : styles.bubbleTextTheirs]}>
            {text}
          </Text>
        )}
        <View style={styles.bubbleMeta}>
          <Text style={[styles.bubbleTime, isOwn ? styles.bubbleTimeOwn : styles.bubbleTimeTheirs]}>
            {formatMessageTime(message.createdAt)}
          </Text>
          {isOwn && (
            <Text style={[styles.readReceipt, message.read ? styles.readReceiptRead : styles.readReceiptUnread]}>
              {' '}✓✓
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default function TenantChatScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const uid = useSelector((state: RootState) => state.auth.uid);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [otherPartyName, setOtherPartyName] = useState('');
  const [otherPartyPhoto, setOtherPartyPhoto] = useState('');
  const [propertyTitle, setPropertyTitle] = useState('');

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);

  // Load conversation and subscribe to messages
  useEffect(() => {
    if (!id || !uid) return;

    let isMounted = true;

    const initialize = async (): Promise<void> => {
      try {
        const convo = await ConversationService.getConversation(id);
        if (!isMounted) return;

        if (convo) {
          setConversation(convo);
          setPropertyTitle(convo.propertyTitle ?? '');

          // Enrich with landlord info (other party for tenant is landlord)
          try {
            const landlordDoc = await firestore().collection('users').doc(convo.landlordId).get();
            if (!isMounted) return;
            if (landlordDoc.exists) {
              const data = landlordDoc.data() as Record<string, unknown>;
              const firstName = typeof data.firstName === 'string' ? data.firstName : '';
              const lastName = typeof data.lastName === 'string' ? data.lastName : '';
              const photoUrl = typeof data.photoUrl === 'string' ? data.photoUrl : '';
              setOtherPartyName(`${firstName} ${lastName}`.trim());
              setOtherPartyPhoto(photoUrl);
            }
          } catch {
            // Non-critical: leave name empty
          }

          // Enrich property title if not cached on conversation
          if (!convo.propertyTitle) {
            try {
              const propDoc = await firestore().collection('properties').doc(convo.propertyId).get();
              if (!isMounted) return;
              if (propDoc.exists) {
                const pData = propDoc.data() as Record<string, unknown>;
                const title = typeof pData.title === 'string' ? pData.title : '';
                setPropertyTitle(title);
              }
            } catch {
              // Non-critical
            }
          }

          // Mark messages as read
          await ConversationService.markMessagesRead(id, uid);
        }
      } catch {
        // Conversation load failed — handled by empty state
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initialize();

    // Subscribe to real-time messages
    unsubscribeRef.current = ConversationService.subscribeToMessages(id, (msgs) => {
      if (!isMounted) return;
      setMessages(msgs);
    });

    return () => {
      isMounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [id, uid]);

  const handleSend = useCallback(async (): Promise<void> => {
    const text = inputText.trim();
    if (!text || sending || !id) return;

    setSending(true);
    setInputText('');

    try {
      const sendMessage = functions().httpsCallable('sendMessage');
      await sendMessage({
        conversationId: id,
        type: 'text',
        content: { text },
      });
    } catch {
      // Restore input on failure
      setInputText(text);
    } finally {
      setSending(false);
    }
  }, [inputText, sending, id]);

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isOwn = item.senderId === uid;
      const showTimestamp = shouldShowTimestamp(messages, index);

      return (
        <MessageBubble
          message={item}
          isOwn={isOwn}
          showTimestamp={showTimestamp}
        />
      );
    },
    [messages, uid]
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const headerTitle = otherPartyName || 'Loading...';
  const headerSubtitle = propertyTitle || '';

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Custom Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Text style={styles.backArrow}>{'←'}</Text>
        </Pressable>
        <View style={styles.headerInfo}>
          <View style={styles.headerNameRow}>
            <Text style={styles.headerName} numberOfLines={1}>
              {headerTitle}
            </Text>
            {conversation && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}
          </View>
          {headerSubtitle !== '' && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {headerSubtitle}
            </Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Message List */}
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>Start the conversation</Text>
            <Text style={styles.emptySubtitle}>
              Say hello to get the conversation started
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.messageList}
            inverted={false}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={TEXT_SECONDARY}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />
          <Pressable
            onPress={handleSend}
            disabled={inputText.trim().length === 0 || sending}
            style={[
              styles.sendButton,
              inputText.trim().length === 0 || sending
                ? styles.sendButtonDisabled
                : styles.sendButtonActive,
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color={SURFACE} />
            ) : (
              <Text style={styles.sendButtonIcon}>➤</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BG,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  backArrow: {
    fontSize: 22,
    color: PRIMARY,
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_COLOR,
    flexShrink: 1,
  },
  verifiedBadge: {
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedText: {
    color: SUCCESS,
    fontSize: 11,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 1,
  },

  // Message list
  messageList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingBottom: 12,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_COLOR,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Bubbles
  bubbleWrapper: {
    marginVertical: 2,
    maxWidth: '80%',
  },
  bubbleWrapperLeft: {
    alignSelf: 'flex-start',
  },
  bubbleWrapperRight: {
    alignSelf: 'flex-end',
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 60,
  },
  bubbleOwn: {
    backgroundColor: PRIMARY,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: SURFACE,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: BORDER,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  bubbleTextOwn: {
    color: SURFACE,
  },
  bubbleTextTheirs: {
    color: TEXT_COLOR,
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
  },
  bubbleTime: {
    fontSize: 10,
  },
  bubbleTimeOwn: {
    color: 'rgba(255,255,255,0.7)',
  },
  bubbleTimeTheirs: {
    color: TEXT_SECONDARY,
  },
  readReceipt: {
    fontSize: 10,
  },
  readReceiptRead: {
    color: 'rgba(255,255,255,0.7)',
  },
  readReceiptUnread: {
    color: 'rgba(255,255,255,0.4)',
  },
  timestampLabel: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    alignSelf: 'center',
    marginBottom: 4,
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },

  // System messages
  systemMessageContainer: {
    alignItems: 'center',
  },
  systemMessageText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: TEXT_COLOR,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: PRIMARY,
  },
  sendButtonDisabled: {
    backgroundColor: BORDER,
  },
  sendButtonIcon: {
    color: SURFACE,
    fontSize: 16,
    marginLeft: 2,
  },
});
