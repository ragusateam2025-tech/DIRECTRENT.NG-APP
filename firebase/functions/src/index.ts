import * as admin from 'firebase-admin';

admin.initializeApp();

// Auth triggers
export { onUserCreated } from './auth/onCreate';

// Auth callables
export { createProfile } from './auth/createProfile';

// Sprint 2: Verification callables
export { verifyBvn } from './verification/verifyBvn';
export { verifyNin } from './verification/verifyNin';

// Sprint 2: Bank account verification
export { verifyBankAccount } from './verification/verifyBankAccount';

// Sprint 4: Property functions
export { trackView } from './properties/trackView';
export { calculateMarketRate } from './properties/calculateMarketRate';
export { expireListings } from './properties/expireListings';

// Sprint 4: Applications + Messaging
export { submitApplication } from './applications/submitApplication';
export { respondToApplication } from './applications/respondToApplication';
export { createConversation } from './messaging/createConversation';
export { sendMessage } from './messaging/sendMessage';

// Sprint 5: Payment functions
export { initializePayment } from './payments/initializePayment';
export { paystackWebhook } from './payments/paystackWebhook';

// Sprint 6: Lease + Reviews + Analytics
export { generateLeaseDocument } from './lease/generateLeaseDocument';
export { signLeaseDocument } from './lease/signLeaseDocument';
export { submitReview } from './reviews/submitReview';
export { respondToReview } from './reviews/respondToReview';
export { handleDispute } from './payments/handleDispute';
export { processRefund } from './payments/processRefund';
export { dailyCleanup } from './scheduled/cleanup';

// Sprint 7: Notification triggers
export { onNewApplication } from './notifications/onNewApplication';
export { onNewMessage } from './notifications/onNewMessage';
export { onPaymentCompleted } from './notifications/onPaymentReceived';

// Sprint 7: Listing limit enforcement
export { enforceListingLimit } from './properties/enforceListingLimit';

// Lease expiry notifications
export { checkLeaseExpiry } from './leases/checkLeaseExpiry';

// Analytics
export { trackPropertyView } from './analytics/trackPropertyView';
export { generateDailyReport } from './analytics/generateDailyReport';
