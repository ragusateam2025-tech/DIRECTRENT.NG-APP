import firestore from '@react-native-firebase/firestore';
import type { Conversation, Message } from '../types/conversation';

export const ConversationService = {
  getConversations: async (uid: string, role: 'tenant' | 'landlord'): Promise<Conversation[]> => {
    const field = role === 'tenant' ? 'tenantId' : 'landlordId';
    const snap = await firestore()
      .collection('conversations')
      .where(field, '==', uid)
      .where('status', '==', 'active')
      .orderBy('updatedAt', 'desc')
      .get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
  },

  subscribeToConversations: (
    uid: string,
    role: 'tenant' | 'landlord',
    onUpdate: (conversations: Conversation[]) => void
  ) => {
    const field = role === 'tenant' ? 'tenantId' : 'landlordId';
    return firestore()
      .collection('conversations')
      .where(field, '==', uid)
      .where('status', '==', 'active')
      .orderBy('updatedAt', 'desc')
      .onSnapshot(snap => {
        const convos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
        onUpdate(convos);
      });
  },

  subscribeToMessages: (
    conversationId: string,
    onUpdate: (messages: Message[]) => void
  ) => {
    return firestore()
      .collection('conversations')
      .doc(conversationId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .onSnapshot(snap => {
        const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        onUpdate(msgs);
      });
  },

  markMessagesRead: async (conversationId: string, uid: string): Promise<void> => {
    await firestore()
      .collection('conversations')
      .doc(conversationId)
      .update({ [`unreadCount.${uid}`]: 0 });
  },

  getConversation: async (conversationId: string): Promise<Conversation | null> => {
    const doc = await firestore().collection('conversations').doc(conversationId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Conversation;
  },
};
