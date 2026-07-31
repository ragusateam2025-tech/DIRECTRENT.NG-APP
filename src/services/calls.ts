import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
import { db, COLLECTIONS } from '../lib/firebase';
import { postCallMessage } from './messages';
import type { Call, CallOutcome, CallStatus, Conversation } from '../types';

/**
 * Call signalling over Firestore.
 *
 * WebRTC moves the audio; it cannot introduce the two phones to each other.
 * They have to swap session descriptions and network candidates first, and
 * something both can reach must carry that. Firestore already sits between
 * these two users and already enforces who may see their thread, so it does
 * the job without adding a service or a second set of permissions to keep in
 * step.
 *
 * This module deliberately knows nothing about WebRTC. It moves opaque
 * strings between two documents. The native layer that produces those strings
 * can be built, replaced or swapped for a vendor without touching any of this.
 */

/** How long an unanswered call rings before it is recorded as missed. */
export const RING_TIMEOUT_MS = 45_000;

export function callsRef() {
  return collection(db, COLLECTIONS.calls);
}

/** ICE candidates, one subcollection per side, appended as they are found. */
export function candidatesRef(callId: string, side: 'caller' | 'callee') {
  return collection(db, COLLECTIONS.calls, callId, `${side}Candidates`);
}

/**
 * Places a call and returns the document to signal through.
 *
 * The offer is written separately by the native layer once it has one, so a
 * call appears as ringing the moment it is placed rather than after the
 * device has finished negotiating with itself.
 */
export async function placeCall(
  conversation: Conversation,
  callerId: string,
  callerName: string,
): Promise<Call> {
  const calleeId =
    callerId === conversation.landlordId ? conversation.tenantId : conversation.landlordId;

  const ref = doc(callsRef());
  const call: Call = {
    id: ref.id,
    conversationId: conversation.id,
    callerId,
    calleeId,
    participants: [callerId, calleeId],
    callerName,
    status: 'ringing',
    createdAt: Date.now(),
  };

  await setDoc(ref, call);
  return call;
}

/** Attaches the caller's offer once the native layer has produced one. */
export async function setOffer(callId: string, offer: { type: string; sdp: string }) {
  await updateDoc(doc(db, COLLECTIONS.calls, callId), { offer });
}

/** Accepts a ringing call by publishing the answer. */
export async function answerCall(callId: string, answer: { type: string; sdp: string }) {
  await updateDoc(doc(db, COLLECTIONS.calls, callId), {
    answer,
    status: 'connected' as CallStatus,
    connectedAt: Date.now(),
  });
}

/** Appends one ICE candidate. Both sides write to their own subcollection. */
export async function addCandidate(
  callId: string,
  side: 'caller' | 'callee',
  candidate: object,
) {
  await addDoc(candidatesRef(callId, side), candidate);
}

/**
 * Ends a call and writes the record of it into the conversation.
 *
 * The message is the point. A call that rang out and left nothing behind is
 * indistinguishable from no call at all — the other person has no idea anyone
 * tried. Writing it into the thread means the attempt survives, and the reply
 * can be a message rather than a callback nobody knows to make.
 */
export async function endCall(
  callId: string,
  outcome: CallOutcome,
  actorId: string,
): Promise<void> {
  const ref = doc(db, COLLECTIONS.calls, callId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return;

  const call = snapshot.data() as Call;

  // Already finished — a decline racing a hang-up must not write two records.
  if (call.status === 'ended' || call.status === 'missed' || call.status === 'declined') {
    return;
  }

  const endedAt = Date.now();
  const seconds = call.connectedAt
    ? Math.max(1, Math.round((endedAt - call.connectedAt) / 1000))
    : undefined;

  await updateDoc(ref, {
    status: outcome === 'completed' ? ('ended' as CallStatus) : (outcome as CallStatus),
    endedAt,
  });

  await postCallMessage(call.conversationId, call.callerId, outcome, seconds, actorId);
}

/**
 * Watches for calls ringing this user.
 *
 * Sorted and filtered on the device: a user has at most one call ringing, so
 * a composite index would be cost with no benefit.
 */
export function subscribeToIncomingCalls(
  uid: string,
  onRinging: (call: Call | null) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(callsRef(), where('participants', 'array-contains', uid));

  return onSnapshot(
    q,
    snapshot => {
      const ringing = snapshot.docs
        .map(d => d.data() as Call)
        .filter(c => c.status === 'ringing' && c.calleeId === uid)
        // A stale ringing document from a killed app must not ring forever.
        .filter(c => Date.now() - c.createdAt < RING_TIMEOUT_MS)
        .sort((a, b) => b.createdAt - a.createdAt);

      onRinging(ringing[0] ?? null);
    },
    error => onError?.(error),
  );
}

/** Watches one call, for both sides to follow its progress. */
export function subscribeToCall(
  callId: string,
  onChange: (call: Call | null) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, COLLECTIONS.calls, callId),
    snapshot => onChange(snapshot.exists() ? (snapshot.data() as Call) : null),
    error => onError?.(error),
  );
}
