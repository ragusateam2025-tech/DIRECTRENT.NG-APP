import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type MessageType = 'text' | 'image' | 'system' | 'application_update' | 'property_card';
export type SenderType = 'landlord' | 'tenant';

export interface MessageContent {
  text?: string | null;
  imageUrl?: string | null;
}

export interface Message {
  id: string;
  senderId: string;
  senderType: SenderType;
  type: MessageType;
  content: MessageContent;
  read: boolean;
  readAt?: FirebaseFirestoreTypes.Timestamp | null;
  createdAt: FirebaseFirestoreTypes.Timestamp;
}

export interface LastMessage {
  text: string;
  senderId: string;
  timestamp: FirebaseFirestoreTypes.Timestamp;
  type: MessageType;
}

export interface Conversation {
  id: string;
  landlordId: string;
  tenantId: string;
  propertyId: string;
  lastMessage: LastMessage | null;
  unreadCount: Record<string, number>;
  applicationId: string | null;
  applicationStatus: 'none' | 'pending' | 'accepted' | 'rejected';
  status: 'active' | 'archived' | 'blocked';
  createdAt: FirebaseFirestoreTypes.Timestamp;
  updatedAt: FirebaseFirestoreTypes.Timestamp;
  // Enriched client-side (not in Firestore)
  otherPartyName?: string;
  otherPartyPhoto?: string;
  propertyTitle?: string;
  propertyPhoto?: string;
}
