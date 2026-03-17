import { https } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

interface CreateConversationData {
  propertyId: string;
  landlordId: string;
  initialMessage?: string;
}

export const createConversation = https.onCall(
  { enforceAppCheck: false },
  async (request) => {
    // 1. Auth check
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'Must be logged in');
    }
    const uid = request.auth.uid;
    const data = request.data as CreateConversationData;

    // 2. Validate input
    if (!data.propertyId || typeof data.propertyId !== 'string') {
      throw new https.HttpsError('invalid-argument', 'propertyId is required');
    }
    if (!data.landlordId || typeof data.landlordId !== 'string') {
      throw new https.HttpsError('invalid-argument', 'landlordId is required');
    }
    if (
      data.initialMessage !== undefined &&
      typeof data.initialMessage !== 'string'
    ) {
      throw new https.HttpsError(
        'invalid-argument',
        'initialMessage must be a string if provided',
      );
    }

    const db = admin.firestore();

    // 3. Load property — verify it exists
    const propertySnap = await db.collection('properties').doc(data.propertyId).get();
    if (!propertySnap.exists) {
      throw new https.HttpsError('not-found', 'Property not found');
    }

    // 4. Check caller is NOT the landlord — tenant initiates conversation
    if (data.landlordId === uid) {
      throw new https.HttpsError(
        'permission-denied',
        'Landlords cannot initiate a conversation about their own property',
      );
    }

    // 5. Deterministic conversation ID
    const conversationId = `${data.landlordId}_${uid}_${data.propertyId}`;
    const conversationRef = db.collection('conversations').doc(conversationId);

    // 6. Check if conversation already exists
    const existingSnap = await conversationRef.get();
    if (existingSnap.exists) {
      return { success: true, conversationId };
    }

    const now = admin.firestore.Timestamp.now();

    // 7. Create conversation doc
    const conversationDoc: Record<string, unknown> = {
      landlordId: data.landlordId,
      tenantId: uid,
      propertyId: data.propertyId,
      lastMessage: data.initialMessage
        ? {
            text: data.initialMessage,
            senderId: uid,
            timestamp: now,
            type: 'text',
          }
        : null,
      unreadCount: {
        [data.landlordId]: data.initialMessage ? 1 : 0,
        [uid]: 0,
      },
      applicationId: null,
      applicationStatus: 'none',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    // 8. If initialMessage provided, batch create conversation + first message
    if (data.initialMessage) {
      const batch = db.batch();
      const messagesRef = conversationRef.collection('messages').doc();

      batch.set(conversationRef, conversationDoc);
      batch.set(messagesRef, {
        senderId: uid,
        senderType: 'tenant',
        type: 'text',
        content: { text: data.initialMessage },
        read: false,
        createdAt: now,
      });

      await batch.commit();
    } else {
      await conversationRef.set(conversationDoc);
    }

    // 9. Return result
    return { success: true, conversationId };
  },
);
