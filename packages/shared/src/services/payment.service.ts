import functions from '@react-native-firebase/functions';
import firestore from '@react-native-firebase/firestore';

interface InitializePaymentResult {
  reference: string;
  authorizationUrl: string;
  accessCode: string;
  breakdown: Record<string, unknown>;
  escrowInfo: Record<string, unknown>;
}

interface PaymentStatus {
  status: string;
  amount: number;
}

export const PaymentService = {
  /**
   * Initialise a Paystack payment for a rental application.
   * Calls the `initializePayment` Cloud Function.
   */
  initializePayment: async (
    applicationId: string,
    paymentMethod?: string
  ): Promise<InitializePaymentResult> => {
    const callable = functions().httpsCallable('initializePayment');
    const result = await callable({ applicationId, paymentMethod });
    return result.data as InitializePaymentResult;
  },

  /**
   * Get the current status and amount for a payment document.
   */
  getPaymentStatus: async (paymentId: string): Promise<PaymentStatus> => {
    const doc = await firestore().collection('payments').doc(paymentId).get();
    if (!doc.exists) {
      throw new Error(`Payment ${paymentId} not found`);
    }
    const data = doc.data() as PaymentStatus;
    return { status: data.status, amount: data.amount };
  },

  /**
   * Fetch paginated payment history for a user (tenant or landlord).
   */
  getPaymentHistory: async (
    uid: string,
    role: 'tenant' | 'landlord'
  ): Promise<Record<string, unknown>[]> => {
    const field = role === 'tenant' ? 'tenantId' : 'landlordId';
    const snapshot = await firestore()
      .collection('payments')
      .where(field, '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
};
