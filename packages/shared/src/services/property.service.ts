import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { Property, SearchFilters, SearchResult } from '../types/property';

export const PropertyService = {
  /**
   * Get a single property by ID and increment view count
   */
  getProperty: async (propertyId: string): Promise<Property | null> => {
    const doc = await firestore().collection('properties').doc(propertyId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Property;
  },

  /**
   * Search properties with filters and pagination
   */
  searchProperties: async (
    filters: SearchFilters = {},
    limit: number = 20,
    cursor?: string
  ): Promise<SearchResult> => {
    let query: FirebaseFirestoreTypes.Query<FirebaseFirestoreTypes.DocumentData> = firestore()
      .collection('properties')
      .where('status.listing', '==', 'active')
      .where('status.availability', '==', 'available');

    // Area filter (Firestore 'in' supports up to 10 values)
    if (filters.areas && filters.areas.length > 0) {
      query = query.where('location.area', 'in', filters.areas.slice(0, 10));
    }

    // Price range
    if (filters.minPrice && filters.minPrice > 0) {
      query = query.where('pricing.annualRent', '>=', filters.minPrice);
    }
    if (filters.maxPrice && filters.maxPrice > 0) {
      query = query.where('pricing.annualRent', '<=', filters.maxPrice);
    }

    // Verified only
    if (filters.verifiedOnly) {
      query = query.where('status.verified', '==', true);
    }

    // Sorting
    switch (filters.sortBy) {
      case 'price_asc':
        query = query.orderBy('pricing.annualRent', 'asc');
        break;
      case 'price_desc':
        query = query.orderBy('pricing.annualRent', 'desc');
        break;
      case 'newest':
        query = query.orderBy('publishedAt', 'desc');
        break;
      default:
        query = query.orderBy('publishedAt', 'desc');
    }

    // Pagination cursor
    if (cursor) {
      const cursorDoc = await firestore().collection('properties').doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    query = query.limit(limit + 1);

    const snapshot = await query.get();
    const docs = snapshot.docs;
    const hasMore = docs.length > limit;

    let properties: Property[] = docs.slice(0, limit).map((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>) => ({
      id: doc.id,
      ...doc.data(),
    })) as Property[];

    // Client-side filtering for fields that can't combine with inequality filters
    if (filters.bedrooms && filters.bedrooms.length > 0) {
      properties = properties.filter(p => filters.bedrooms!.includes(p.details.bedrooms));
    }
    if (filters.propertyTypes && filters.propertyTypes.length > 0) {
      properties = properties.filter(p => filters.propertyTypes!.includes(p.propertyType));
    }
    if (filters.amenities && filters.amenities.length > 0) {
      properties = properties.filter(p =>
        filters.amenities!.every(a => p.amenities.includes(a))
      );
    }

    return {
      properties,
      total: properties.length,
      hasMore,
      nextCursor: hasMore ? docs[limit - 1].id : undefined,
    };
  },

  /**
   * Get all active properties for a landlord
   */
  getPropertiesByLandlord: async (landlordId: string): Promise<Property[]> => {
    const snapshot = await firestore()
      .collection('properties')
      .where('landlordId', '==', landlordId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Property[];
  },

  /**
   * Get featured properties (for home screen carousel)
   */
  getFeaturedProperties: async (limitCount: number = 5): Promise<Property[]> => {
    const snapshot = await firestore()
      .collection('properties')
      .where('status.listing', '==', 'active')
      .where('status.featured', '==', true)
      .orderBy('publishedAt', 'desc')
      .limit(limitCount)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Property[];
  },

  /**
   * Get recently listed properties
   */
  getRecentProperties: async (limitCount: number = 10): Promise<Property[]> => {
    const snapshot = await firestore()
      .collection('properties')
      .where('status.listing', '==', 'active')
      .where('status.availability', '==', 'available')
      .orderBy('publishedAt', 'desc')
      .limit(limitCount)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Property[];
  },

  /**
   * Get saved properties for a tenant by IDs
   */
  getPropertiesByIds: async (ids: string[]): Promise<Property[]> => {
    if (ids.length === 0) return [];
    // Firestore 'in' supports max 10 items; chunk if needed
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 10) {
      chunks.push(ids.slice(i, i + 10));
    }

    const results: Property[] = [];
    for (const chunk of chunks) {
      const snapshot = await firestore()
        .collection('properties')
        .where(firestore.FieldPath.documentId(), 'in', chunk)
        .get();
      snapshot.docs.forEach(doc => results.push({ id: doc.id, ...doc.data() } as Property));
    }
    return results;
  },

  /**
   * Save a property for a tenant
   */
  saveProperty: async (tenantId: string, propertyId: string): Promise<void> => {
    await firestore()
      .collection('tenants')
      .doc(tenantId)
      .update({
        savedProperties: firestore.FieldValue.arrayUnion(propertyId),
      });
    // Increment savedCount on property
    await firestore()
      .collection('properties')
      .doc(propertyId)
      .update({
        'analytics.savedCount': firestore.FieldValue.increment(1),
      });
  },

  /**
   * Unsave a property for a tenant
   */
  unsaveProperty: async (tenantId: string, propertyId: string): Promise<void> => {
    await firestore()
      .collection('tenants')
      .doc(tenantId)
      .update({
        savedProperties: firestore.FieldValue.arrayRemove(propertyId),
      });
    await firestore()
      .collection('properties')
      .doc(propertyId)
      .update({
        'analytics.savedCount': firestore.FieldValue.increment(-1),
      });
  },

  /**
   * Increment view count for a property
   */
  incrementViewCount: async (propertyId: string): Promise<void> => {
    await firestore()
      .collection('properties')
      .doc(propertyId)
      .update({
        'analytics.viewCount': firestore.FieldValue.increment(1),
        'analytics.lastViewedAt': firestore.Timestamp.now(),
      });
  },
};
