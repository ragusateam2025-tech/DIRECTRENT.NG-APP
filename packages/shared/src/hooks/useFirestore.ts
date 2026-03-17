import { useState, useEffect, useCallback } from 'react';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

type WhereFilterOp = FirebaseFirestoreTypes.WhereFilterOp;

interface DocumentHookResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface CollectionHookResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Subscribe to a single Firestore document in real time.
 * Pass `null` as `docId` to skip the subscription.
 */
export function useDocument<T>(
  collection: string,
  docId: string | null
): DocumentHookResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(docId !== null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!docId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = firestore()
      .collection(collection)
      .doc(docId)
      .onSnapshot(
        snap => {
          if (snap.exists) {
            setData({ id: snap.id, ...snap.data() } as T);
          } else {
            setData(null);
          }
          setLoading(false);
        },
        err => {
          setError(err.message);
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [collection, docId, tick]);

  return { data, loading, error, refetch };
}

/**
 * Subscribe to a Firestore collection in real time with optional filtering,
 * ordering and limit.
 */
export function useCollection<T>(
  collection: string,
  queries?: Array<[string, WhereFilterOp, unknown]>,
  orderByField?: string,
  limitCount?: number
): CollectionHookResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    let query: FirebaseFirestoreTypes.Query<FirebaseFirestoreTypes.DocumentData> =
      firestore().collection(collection);

    if (queries) {
      for (const [field, op, value] of queries) {
        query = query.where(field, op, value);
      }
    }

    if (orderByField) {
      query = query.orderBy(orderByField, 'desc');
    }

    if (limitCount && limitCount > 0) {
      query = query.limit(limitCount);
    }

    const unsubscribe = query.onSnapshot(
      snapshot => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        setData(docs);
        setLoading(false);
      },
      err => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collection, tick]);

  return { data, loading, error, refetch };
}
