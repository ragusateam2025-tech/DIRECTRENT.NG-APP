import functions from '@react-native-firebase/functions';
import firestore from '@react-native-firebase/firestore';

export type AnalyticsPeriod = '7d' | '30d' | '90d';

export const AnalyticsService = {
  /**
   * Record a property view event via Cloud Function.
   */
  trackPropertyView: async (propertyId: string): Promise<void> => {
    const callable = functions().httpsCallable('trackPropertyView');
    await callable({ propertyId });
  },

  /**
   * Retrieve aggregated analytics for a landlord over a given period.
   */
  getLandlordAnalytics: async (
    uid: string,
    period: AnalyticsPeriod
  ): Promise<Record<string, unknown>> => {
    const doc = await firestore()
      .collection('analytics')
      .doc(`${uid}_${period}`)
      .get();

    if (!doc.exists) return {};
    return { id: doc.id, ...doc.data() };
  },

  /**
   * Retrieve analytics for a specific property over a given period.
   */
  getPropertyAnalytics: async (
    propertyId: string,
    period: AnalyticsPeriod
  ): Promise<Record<string, unknown>> => {
    const doc = await firestore()
      .collection('properties')
      .doc(propertyId)
      .collection('analytics')
      .doc(period)
      .get();

    if (!doc.exists) return {};
    return { id: doc.id, ...doc.data() };
  },
};
