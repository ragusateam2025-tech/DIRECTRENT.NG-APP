import { https } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

interface SendMessageData {
  conversationId: string;
  type: 'text' | 'image';
  content: {
    text?: string;
    imageUrl?: string;
  };
}

interface ConversationDoc {
  landlordId: string;
  tenantId: string;
  propertyId: string;
  status: string;
}

export const sendMessage = https.onCall(
  { enforceAppCheck: false },
  async (request) => {
    // 1. Auth check
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'Must be logged in');
    }
    const uid = request.auth.uid;
    const data = request.data as SendMessageData;

    // 2. Validate input
    if (!data.conversationId || typeof data.conversationId !== 'string') {
      throw new https.HttpsError('invalid-argument', 'conversationId is required');
    }
    if (data.type !== 'text' && data.type !== 'image') {
      throw new https.HttpsError('invalid-argument', 'type must be text or image');
    }
    if (data.type === 'text') {
      if (!data.content?.text || typeof data.content.text !== 'string') {
        throw new https.HttpsError(
          'invalid-argument',
          'content.text is required for type text',
        );
      }
    }
    if (data.type === 'image') {
      if (!data.content?.imageUrl || typeof data.content.imageUrl !== 'string') {
        throw new https.HttpsError(
          'invalid-argument',
          'content.imageUrl is required for type image',
        );
      }
    }

    const db = admin.firestore();

    // 3. Load conversation
    const conversationRef = db.collection('conversations').doc(data.conversationId);
    const conversationSnap = await conversationRef.get();
    if (!conversationSnap.exists) {
      throw new https.HttpsError('not-found', 'Conversation not found');
    }
    const conversationData = conversationSnap.data() as ConversationDoc;

    // 4. Verify caller is a participant
    if (
      conversationData.landlordId !== uid &&
      conversationData.tenantId !== uid
    ) {
      throw new https.HttpsError(
        'permission-denied',
        'You are not a participant in this conversation',
      );
    }

    // 5. Determine senderType and recipientId
    const senderType: 'landlord' | 'tenant' =
      conversationData.landlordId === uid ? 'landlord' : 'tenant';
    const recipientId =
      conversationData.landlordId === uid
        ? conversationData.tenantId
        : conversationData.landlordId;

    const now = admin.firestore.Timestamp.now();

    // 7. Create message in subcollection + 8. Update conversation (batch)
    const batch = db.batch();
    const newMessageRef = conversationRef.collection('messages').doc();

    batch.set(newMessageRef, {
      senderId: uid,
      senderType,
      type: data.type,
      content: {
        text: data.content.text ?? null,
        imageUrl: data.content.imageUrl ?? null,
      },
      read: false,
      createdAt: now,
    });

    batch.update(conversationRef, {
      lastMessage: {
        text: data.content.text ?? '📷 Image',
        senderId: uid,
        timestamp: now,
        type: data.type,
      },
      [`unreadCount.${recipientId}`]: admin.firestore.FieldValue.increment(1),
      updatedAt: now,
    });

    await batch.commit();

    // 9. Return result
    return { success: true, messageId: newMessageRef.id };
  },
);
