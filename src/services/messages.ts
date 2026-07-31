import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import type { Application, Conversation, Listing, Message, UserProfile } from '../types';

/**
 * One thread per tenant per property.
 *
 * Composite id rather than a generated one, same reasoning as applicationId:
 * a tenant tapping "Message owner" twice on a slow connection should reopen
 * the thread they already have, not start a second one the owner then sees
 * as two separate people.
 */
export function conversationId(listingId: string, tenantId: string): string {
  return `${listingId}_${tenantId}`;
}

function messagesRef(id: string) {
  return collection(db, COLLECTIONS.conversations, id, COLLECTIONS.messages);
}

/**
 * Returns the thread for this tenant and listing, creating it if this is the
 * first contact. Safe to call on every open — an existing thread is returned
 * untouched rather than reset.
 */
export async function ensureConversation(
  listing: Listing,
  tenant: UserProfile,
  landlordName: string,
): Promise<Conversation> {
  const id = conversationId(listing.id, tenant.uid);
  const ref = doc(db, COLLECTIONS.conversations, id);
  const existing = await getDoc(ref);

  if (existing.exists()) return existing.data() as Conversation;

  const conversation: Conversation = {
    id,
    listingId: listing.id,
    landlordId: listing.ownerId,
    tenantId: tenant.uid,
    participants: [listing.ownerId, tenant.uid],
    landlordName,
    tenantName: tenant.fullName,
    listingTitle: listing.basicInfo.title,
    listingArea: listing.location.area,
    lastMessage: '',
    lastMessageAt: Date.now(),
    lastSenderId: '',
    unread: { [listing.ownerId]: 0, [tenant.uid]: 0 },
    createdAt: Date.now(),
  };

  await setDoc(ref, conversation);
  return conversation;
}

/** A single thread by id, or null if it has gone. */
export async function fetchConversation(id: string): Promise<Conversation | null> {
  const snapshot = await getDoc(doc(db, COLLECTIONS.conversations, id));
  return snapshot.exists() ? (snapshot.data() as Conversation) : null;
}

/**
 * Appends a message and updates the thread summary in the same call.
 *
 * The summary is denormalised onto the conversation so the list screen can
 * render without reading the last message of every thread separately.
 */
export async function sendMessage(
  conversation: Conversation,
  senderId: string,
  text: string,
): Promise<void> {
  const body = text.trim();
  if (!body) return;

  const recipientId =
    senderId === conversation.landlordId ? conversation.tenantId : conversation.landlordId;

  await addDoc(messagesRef(conversation.id), {
    conversationId: conversation.id,
    senderId,
    type: 'text',
    text: body,
    createdAt: Date.now(),
  });

  await updateDoc(doc(db, COLLECTIONS.conversations, conversation.id), {
    lastMessage: body,
    lastMessageAt: Date.now(),
    lastSenderId: senderId,
    [`unread.${recipientId}`]: increment(1),
  });
}

/**
 * Live messages, oldest first so the list reads top to bottom.
 *
 * Returns the unsubscribe function — callers must call it on unmount or the
 * listener outlives the screen.
 */
export function subscribeToMessages(
  id: string,
  onChange: (messages: Message[]) => void,
): () => void {
  const q = query(messagesRef(id), orderBy('createdAt', 'asc'));

  return onSnapshot(q, snapshot => {
    onChange(snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Message));
  });
}

/**
 * Live list of every thread this user is part of, newest activity first.
 *
 * Sorted in JS rather than with orderBy: combining array-contains with an
 * ordered field needs a composite index, and a user has few enough threads
 * that sorting them on the device costs nothing.
 */
export function subscribeToConversations(
  uid: string,
  onChange: (conversations: Conversation[]) => void,
): () => void {
  const q = query(
    collection(db, COLLECTIONS.conversations),
    where('participants', 'array-contains', uid),
  );

  return onSnapshot(q, snapshot => {
    const conversations = snapshot.docs
      .map(d => d.data() as Conversation)
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
    onChange(conversations);
  });
}

/** Clears this user's unread count. Called when they open the thread. */
export async function markConversationRead(id: string, uid: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.conversations, id), { [`unread.${uid}`]: 0 });
}

/**
 * Opens the thread behind an enquiry, so either party can carry on talking
 * without going back to the listing to find each other.
 *
 * Resolves to the same id as `ensureConversation` for the same tenant and
 * property, so the two entry points meet in one thread rather than two.
 */
export async function ensureConversationFromApplication(
  application: Application,
  landlordName: string,
): Promise<Conversation> {
  const id = conversationId(application.listingId, application.tenantId);
  const ref = doc(db, COLLECTIONS.conversations, id);
  const existing = await getDoc(ref);

  if (existing.exists()) return existing.data() as Conversation;

  const conversation: Conversation = {
    id,
    listingId: application.listingId,
    landlordId: application.landlordId,
    tenantId: application.tenantId,
    participants: [application.landlordId, application.tenantId],
    landlordName,
    tenantName: application.tenantName,
    listingTitle: application.listingTitle,
    listingArea: application.listingArea,
    lastMessage: '',
    lastMessageAt: Date.now(),
    lastSenderId: '',
    unread: { [application.landlordId]: 0, [application.tenantId]: 0 },
    createdAt: Date.now(),
  };

  await setDoc(ref, conversation);
  return conversation;
}
