import { useState, useCallback } from 'react';
import { PaymentService } from '../services/payment.service';

interface PaystackPaymentData {
  reference: string;
  authorizationUrl: string;
  accessCode: string;
  breakdown: Record<string, unknown>;
  escrowInfo: Record<string, unknown>;
}

interface UsePaystackResult {
  initializePayment: (applicationId: string, method?: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  paymentData: PaystackPaymentData | null;
}

/**
 * Hook to initialise a Paystack payment for a rental application.
 * Wraps PaymentService.initializePayment with loading/error state.
 */
export function usePaystack(): UsePaystackResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<PaystackPaymentData | null>(null);

  const initializePayment = useCallback(
    async (applicationId: string, method?: string): Promise<void> => {
      setLoading(true);
      setError(null);
      setPaymentData(null);

      try {
        const result = await PaymentService.initializePayment(applicationId, method);
        setPaymentData(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Payment initialisation failed';
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { initializePayment, loading, error, paymentData };
}
