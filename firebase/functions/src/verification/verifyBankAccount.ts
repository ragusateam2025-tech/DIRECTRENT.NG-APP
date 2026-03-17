/**
 * verifyBankAccount
 *
 * HTTPS Callable — authenticated landlord only.
 * Uses the Paystack API to resolve a bank account number, creates a transfer
 * recipient, and persists the verified account details to the landlord document.
 */
import { https, logger } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import axios from 'axios';

export const verifyBankAccount = https.onCall(
  { enforceAppCheck: false, secrets: ['PAYSTACK_SECRET_KEY'], timeoutSeconds: 30 },
  async (request) => {
    // ── Auth guard ───────────────────────────────────────────────────────────
    if (!request.auth) {
      throw new https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const uid = request.auth.uid;
    const { accountNumber, bankCode } = request.data as {
      accountNumber?: string;
      bankCode?: string;
    };

    // ── Input validation ─────────────────────────────────────────────────────
    if (!accountNumber || !/^\d{10}$/.test(accountNumber)) {
      throw new https.HttpsError('invalid-argument', 'Account number must be 10 digits.');
    }
    if (!bankCode || typeof bankCode !== 'string') {
      throw new https.HttpsError('invalid-argument', 'Bank code is required.');
    }

    const paystackKey = process.env.PAYSTACK_SECRET_KEY;

    // ── Step 1: Resolve account name via Paystack ────────────────────────────
    let accountName: string;
    try {
      const res = await axios.get('https://api.paystack.co/bank/resolve', {
        params: { account_number: accountNumber, bank_code: bankCode },
        headers: { Authorization: `Bearer ${paystackKey}` },
      });
      accountName = res.data.data.account_name as string;
    } catch (err) {
      logger.error('Paystack resolve error', err);
      throw new https.HttpsError(
        'unavailable',
        'Could not verify bank account. Please try again.'
      );
    }

    // ── Step 2: Create Paystack transfer recipient ───────────────────────────
    let recipientCode: string;
    try {
      const res = await axios.post(
        'https://api.paystack.co/transferrecipient',
        {
          type: 'nuban',
          name: accountName,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN',
        },
        {
          headers: {
            Authorization: `Bearer ${paystackKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      recipientCode = res.data.data.recipient_code as string;
    } catch (err) {
      logger.warn('Transfer recipient creation failed', err);
      recipientCode = '';
    }

    // ── Step 3: Persist to Firestore ─────────────────────────────────────────
    const db = admin.firestore();
    const ts = admin.firestore.FieldValue.serverTimestamp();

    await db.collection('landlords').doc(uid).update({
      'bankAccount.accountNumber': accountNumber,
      'bankAccount.bankCode': bankCode,
      'bankAccount.accountName': accountName,
      'bankAccount.paystackRecipientCode': recipientCode,
      'bankAccount.verified': true,
      'bankAccount.verifiedAt': ts,
      updatedAt: ts,
    });

    logger.info(`Bank account verified for uid=${uid}`);
    return { success: true, data: { accountName, recipientCode } };
  }
);
