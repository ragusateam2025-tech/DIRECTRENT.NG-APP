/**
 * Paystack API client
 * Wraps Paystack REST endpoints used by payment Cloud Functions.
 * Secret key is read from process.env.PAYSTACK_SECRET_KEY (injected via CF secret).
 */
import axios from 'axios';

const BASE_URL = 'https://api.paystack.co';

function getSecretKey(): string {
  const key = process.env['PAYSTACK_SECRET_KEY'];
  if (!key) throw new Error('PAYSTACK_SECRET_KEY secret not configured');
  return key;
}

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface PaystackInitData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

interface PaystackApiResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

// ─── Client ───────────────────────────────────────────────────────────────────

export const PaystackClient = {
  /**
   * POST /transaction/initialize
   * Creates a new Paystack transaction and returns the checkout URL + access code.
   */
  async initializeTransaction(params: {
    email: string;
    amount: number;              // Kobo (amount × 100)
    reference: string;
    currency: 'NGN';
    callback_url: string;
    channels?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<PaystackInitData> {
    const response = await axios.post<PaystackApiResponse<PaystackInitData>>(
      `${BASE_URL}/transaction/initialize`,
      params,
      {
        headers: {
          Authorization: `Bearer ${getSecretKey()}`,
          'Content-Type': 'application/json',
        },
        timeout: 15_000,
      }
    );

    if (!response.data.status) {
      throw new Error(response.data.message || 'Paystack initialization failed');
    }

    return response.data.data;
  },

  /**
   * GET /transaction/verify/:reference
   * Verifies a transaction by reference — used for manual verification if webhook is missed.
   */
  async verifyTransaction(reference: string): Promise<{
    status: string;       // 'success' | 'failed' | 'abandoned'
    amount: number;       // Kobo
    channel: string;
    paid_at: string;
    metadata: Record<string, unknown>;
  }> {
    const response = await axios.get<PaystackApiResponse<{
      status: string;
      amount: number;
      channel: string;
      paid_at: string;
      metadata: Record<string, unknown>;
    }>>(
      `${BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${getSecretKey()}` },
        timeout: 15_000,
      }
    );

    if (!response.data.status) {
      throw new Error(response.data.message || 'Verification failed');
    }

    return response.data.data;
  },
};
