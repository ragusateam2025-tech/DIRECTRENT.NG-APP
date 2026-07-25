# Directrent.ng Feature Specification — Part 3
## Messaging, Payments & Lease Management

---

# 8. Messaging System

## 8.1 Direct Messaging

**Feature ID:** MSG-001  
**Feature Name:** In-App Direct Messaging  
**Assigned To:** `frontend-tenant`, `frontend-landlord`, `backend`

### User Stories

```
AS A verified tenant
I WANT TO message landlords directly
SO THAT I can ask questions about properties

AS A landlord
I WANT TO receive and respond to tenant messages
SO THAT I can communicate with interested renters

AS a user
I WANT TO receive push notifications for new messages
SO THAT I can respond quickly
```

### Acceptance Criteria

```gherkin
Feature: Direct Messaging

  Scenario: Start conversation from property listing
    Given I am a verified tenant viewing a property
    When I tap "Message Landlord"
    Then a conversation should be created if not exists
    And I should see the chat screen with property context
    And I should be able to send a message

  Scenario: Send text message
    Given I am in a conversation
    When I type "Is this property still available?"
    And I tap send
    Then the message should be sent
    And I should see it in the chat with timestamp
    And the recipient should receive a push notification

  Scenario: Unverified user cannot message
    Given I am an unverified tenant
    When I try to message a landlord
    Then I should see "Verification required to send messages"
    And I should have option to verify my identity

  Scenario: Message with property card
    Given I am in a conversation
    When I tap "Share Property"
    And I select a property
    Then a property card should be sent in the chat
    And the recipient can tap to view the property

  Scenario: Schedule viewing request
    Given I am a tenant in conversation
    When I tap "Schedule Viewing"
    And I select a date and time
    Then a viewing request should be sent
    And the landlord should see options to confirm or propose alternate time

  Scenario: Conversation archive
    Given I have many conversations
    When I swipe left on a conversation
    And I tap "Archive"
    Then the conversation should move to archived
    And I can access it from the archived section
```

### Technical Specifications

#### 8.1.1 Conversation Data Model

```typescript
// Type: Conversation
// Location: packages/shared/types/conversation.types.ts

export interface Conversation {
  id: string;                       // Format: {landlordId}_{tenantId}_{propertyId}
  
  participants: {
    landlordId: string;
    tenantId: string;
  };
  
  propertyId: string;
  propertySnapshot: {
    title: string;
    primaryPhoto: string;
    annualRent: number;
    area: string;
  };
  
  lastMessage: {
    text: string;
    senderId: string;
    timestamp: Date;
    type: MessageType;
  };
  
  unreadCount: {
    [participantId: string]: number;
  };
  
  applicationId?: string;
  applicationStatus?: 'none' | 'pending' | 'accepted' | 'rejected';
  
  status: 'active' | 'archived' | 'blocked';
  
  createdAt: Date;
  updatedAt: Date;
}

export type MessageType = 
  | 'text' 
  | 'image' 
  | 'document' 
  | 'property_card' 
  | 'application_update'
  | 'schedule_viewing'
  | 'payment_request'
  | 'location'
  | 'system';

export interface Message {
  id: string;
  conversationId: string;
  
  senderId: string;
  senderType: 'landlord' | 'tenant';
  
  type: MessageType;
  content: MessageContent;
  
  read: boolean;
  readAt?: Date;
  
  createdAt: Date;
}

export type MessageContent = 
  | { type: 'text'; text: string }
  | { type: 'image'; imageUrl: string; thumbnailUrl: string }
  | { type: 'document'; documentUrl: string; documentName: string; fileSize: number }
  | { type: 'property_card'; propertyId: string }
  | { type: 'application_update'; status: string; applicationId: string }
  | { type: 'schedule_viewing'; date: Date; time: string; status: 'proposed' | 'confirmed' | 'cancelled' }
  | { type: 'payment_request'; amount: number; paymentType: string; paystackUrl: string }
  | { type: 'location'; latitude: number; longitude: number; address?: string }
  | { type: 'system'; systemMessage: string };
```

#### 8.1.2 Chat Screen Component

```typescript
// Screen: ChatScreen
// Location: apps/tenant/app/messages/[conversationId].tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '@directrent/shared/hooks';

export default function ChatScreen() {
  const { conversationId } = useLocalSearchParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const flatListRef = useRef<FlatList>(null);
  
  // Subscribe to messages
  useEffect(() => {
    const unsubscribe = firestore()
      .collection('conversations')
      .doc(conversationId as string)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot(snapshot => {
        const msgs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Message));
        setMessages(msgs.reverse());
      });
    
    return unsubscribe;
  }, [conversationId]);
  
  // Mark messages as read
  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsRead();
    }
  }, [messages]);
  
  const markMessagesAsRead = async () => {
    const unreadMessages = messages.filter(m => !m.read && m.senderId !== user?.uid);
    
    if (unreadMessages.length === 0) return;
    
    const batch = firestore().batch();
    
    unreadMessages.forEach(msg => {
      const msgRef = firestore()
        .collection('conversations')
        .doc(conversationId as string)
        .collection('messages')
        .doc(msg.id);
      batch.update(msgRef, { read: true, readAt: firestore.Timestamp.now() });
    });
    
    // Reset unread count
    batch.update(
      firestore().collection('conversations').doc(conversationId as string),
      { [`unreadCount.${user?.uid}`]: 0 }
    );
    
    await batch.commit();
  };
  
  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || sending) return;
    
    setSending(true);
    const messageText = inputText.trim();
    setInputText('');
    
    try {
      const sendMessageFn = functions().httpsCallable('sendMessage');
      await sendMessageFn({
        conversationId,
        type: 'text',
        content: { type: 'text', text: messageText }
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
      setInputText(messageText);
    } finally {
      setSending(false);
    }
  }, [inputText, conversationId, sending]);
  
  const sendViewingRequest = useCallback(async (date: Date, time: string) => {
    const sendMessageFn = functions().httpsCallable('sendMessage');
    await sendMessageFn({
      conversationId,
      type: 'schedule_viewing',
      content: {
        type: 'schedule_viewing',
        date: date.toISOString(),
        time,
        status: 'proposed'
      }
    });
  }, [conversationId]);
  
  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId === user?.uid;
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        {renderMessageContent(item)}
        <Text style={styles.timestamp}>
          {formatTime(item.createdAt)}
          {isOwnMessage && item.read && ' ✓✓'}
        </Text>
      </View>
    );
  };
  
  const renderMessageContent = (message: Message) => {
    switch (message.content.type) {
      case 'text':
        return <Text style={styles.messageText}>{message.content.text}</Text>;
      
      case 'image':
        return (
          <TouchableOpacity onPress={() => viewImage(message.content.imageUrl)}>
            <Image source={{ uri: message.content.thumbnailUrl }} style={styles.messageImage} />
          </TouchableOpacity>
        );
      
      case 'property_card':
        return <PropertyMiniCard propertyId={message.content.propertyId} />;
      
      case 'schedule_viewing':
        return (
          <ViewingRequestCard
            date={message.content.date}
            time={message.content.time}
            status={message.content.status}
            onConfirm={() => handleViewingResponse('confirmed')}
            onCancel={() => handleViewingResponse('cancelled')}
            canRespond={message.senderId !== user?.uid}
          />
        );
      
      case 'application_update':
        return (
          <ApplicationStatusCard
            status={message.content.status}
            applicationId={message.content.applicationId}
          />
        );
      
      case 'system':
        return (
          <View style={styles.systemMessage}>
            <Text style={styles.systemText}>{message.content.systemMessage}</Text>
          </View>
        );
      
      default:
        return <Text>Unsupported message type</Text>;
    }
  };
  
  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      {/* Header with property info */}
      <ChatHeader conversation={conversation} />
      
      {/* Messages list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        inverted={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        contentContainerStyle={styles.messagesList}
      />
      
      {/* Quick actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity onPress={() => setShowViewingPicker(true)}>
          <Text style={styles.quickAction}>📅 Schedule Viewing</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowPropertyPicker(true)}>
          <Text style={styles.quickAction}>🏠 Share Property</Text>
        </TouchableOpacity>
      </View>
      
      {/* Input area */}
      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.attachButton} onPress={handleAttachment}>
          <Icon name="attach" size={24} />
        </TouchableOpacity>
        
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          multiline
          maxLength={2000}
        />
        
        <TouchableOpacity 
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || sending}
        >
          <Icon name="send" size={24} color={inputText.trim() ? colors.primary.main : colors.neutral.disabled} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
```

#### 8.1.3 Cloud Function: sendMessage

```typescript
// Function: sendMessage
// Type: HTTPS Callable
// Location: firebase/functions/src/messaging/sendMessage.ts

export const sendMessage = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const senderId = context.auth.uid;
  const { conversationId, type, content } = data;
  
  // Validate sender is verified
  const userDoc = await firestore().collection('users').doc(senderId).get();
  const user = userDoc.data();
  
  if (user.verification.bvn.status !== 'verified' && user.verification.nin.status !== 'verified') {
    throw new functions.https.HttpsError('failed-precondition', 'Verification required to send messages');
  }
  
  // Get conversation
  const conversationDoc = await firestore().collection('conversations').doc(conversationId).get();
  
  if (!conversationDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Conversation not found');
  }
  
  const conversation = conversationDoc.data() as Conversation;
  
  // Validate sender is a participant
  if (conversation.participants.landlordId !== senderId && conversation.participants.tenantId !== senderId) {
    throw new functions.https.HttpsError('permission-denied', 'Not a participant in this conversation');
  }
  
  // Check if conversation is blocked
  if (conversation.status === 'blocked') {
    throw new functions.https.HttpsError('failed-precondition', 'This conversation has been blocked');
  }
  
  const senderType = conversation.participants.landlordId === senderId ? 'landlord' : 'tenant';
  const recipientId = senderType === 'landlord' 
    ? conversation.participants.tenantId 
    : conversation.participants.landlordId;
  
  // Create message
  const messageRef = firestore()
    .collection('conversations')
    .doc(conversationId)
    .collection('messages')
    .doc();
  
  const messageData: Message = {
    id: messageRef.id,
    conversationId,
    senderId,
    senderType,
    type,
    content,
    read: false,
    createdAt: Timestamp.now()
  };
  
  // Get message preview text
  const previewText = getMessagePreview(type, content);
  
  // Batch write
  const batch = firestore().batch();
  
  batch.set(messageRef, messageData);
  
  // Update conversation
  batch.update(conversationDoc.ref, {
    lastMessage: {
      text: previewText,
      senderId,
      timestamp: Timestamp.now(),
      type
    },
    [`unreadCount.${recipientId}`]: FieldValue.increment(1),
    updatedAt: Timestamp.now()
  });
  
  await batch.commit();
  
  // Send push notification
  await sendPushNotification(recipientId, {
    title: `New message from ${user.firstName}`,
    body: previewText,
    data: {
      type: 'NEW_MESSAGE',
      conversationId,
      senderId,
      action: 'open_chat'
    }
  });
  
  return { success: true, messageId: messageRef.id };
});

function getMessagePreview(type: MessageType, content: MessageContent): string {
  switch (type) {
    case 'text':
      return content.text.length > 50 ? content.text.substring(0, 50) + '...' : content.text;
    case 'image':
      return '📷 Photo';
    case 'document':
      return `📄 ${content.documentName}`;
    case 'property_card':
      return '🏠 Shared a property';
    case 'schedule_viewing':
      return '📅 Viewing request';
    case 'payment_request':
      return `💰 Payment request: ${formatCurrency(content.amount)}`;
    case 'location':
      return '📍 Location';
    default:
      return 'New message';
  }
}
```

---

# 9. Payment & Escrow System

## 9.1 Payment Processing

**Feature ID:** PAY-001  
**Feature Name:** Paystack Payment Integration  
**Assigned To:** `payments`, `backend`

### User Stories

```
AS A tenant
I WANT TO pay rent and deposits securely through the app
SO THAT I can complete transactions safely

AS A landlord
I WANT TO receive payments directly to my bank account
SO THAT I don't have to chase tenants for rent

AS the platform
I NEED TO hold security deposits in escrow
SO THAT both parties are protected
```

### Acceptance Criteria

```gherkin
Feature: Payment Processing

  Scenario: Initialize rent payment
    Given I am a tenant with an accepted application
    When I tap "Proceed to Payment"
    Then I should see payment breakdown:
      | Item | Amount |
      | Annual Rent | ₦650,000 |
      | Caution Deposit | ₦650,000 |
      | Service Charge | ₦50,000 |
      | Platform Fee (2%) | ₦13,000 |
      | Total | ₦1,363,000 |
    And I should see available payment methods

  Scenario: Complete card payment
    Given I am on the payment screen
    When I select "Pay with Card"
    And I enter valid card details
    And the payment is successful
    Then I should see payment confirmation
    And a receipt should be generated
    And the landlord should be notified
    And the deposit should be held in escrow

  Scenario: Bank transfer payment
    Given I am on the payment screen
    When I select "Bank Transfer"
    Then I should see generated bank account details
    And I should see a countdown timer (30 minutes)
    When I transfer the exact amount
    Then the payment should be confirmed automatically
    And I should receive confirmation

  Scenario: USSD payment
    Given I am on the payment screen
    When I select "USSD"
    And I select my bank
    Then I should see a USSD code to dial
    And instructions for completing payment
    When I complete the USSD transaction
    Then the payment should be confirmed

  Scenario: Escrow deposit release
    Given I have paid a security deposit held in escrow
    When 7 days pass after move-in
    And no disputes are raised
    Then the deposit should be released to the landlord
    And both parties should be notified

  Scenario: Payment failure handling
    Given I am making a payment
    When the payment fails due to insufficient funds
    Then I should see "Payment failed: Insufficient funds"
    And I should have option to retry or use another method
```

### Technical Specifications

#### 9.1.1 Payment Service

```typescript
// Service: payment.service.ts
// Location: packages/shared/services/

interface PaymentConfig {
  amount: number;
  email: string;
  propertyId: string;
  leaseId?: string;
  type: 'rent' | 'deposit' | 'service_charge' | 'combined';
  breakdown: {
    rent: number;
    deposit: number;
    serviceCharge: number;
    platformFee: number;
  };
}

interface PaystackResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export const PaymentService = {
  /**
   * Initialize a payment transaction
   */
  initializePayment: async (config: PaymentConfig): Promise<PaystackResponse> => {
    const initPaymentFn = functions().httpsCallable('initializePayment');
    const result = await initPaymentFn(config);
    return result.data as PaystackResponse;
  },
  
  /**
   * Verify a payment was successful
   */
  verifyPayment: async (reference: string): Promise<{
    success: boolean;
    amount: number;
    channel: string;
    paidAt: Date;
  }> => {
    const verifyPaymentFn = functions().httpsCallable('verifyPayment');
    const result = await verifyPaymentFn({ reference });
    return result.data;
  },
  
  /**
   * Get payment history
   */
  getPaymentHistory: async (userId: string, role: 'tenant' | 'landlord'): Promise<Payment[]> => {
    const field = role === 'tenant' ? 'tenantId' : 'landlordId';
    
    const snapshot = await firestore()
      .collection('payments')
      .where(field, '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Payment));
  }
};
```

#### 9.1.2 Payment Screen Component

```typescript
// Screen: PaymentScreen
// Location: apps/tenant/app/payment/[applicationId].tsx

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Paystack } from 'react-native-paystack-webview';
import { PaymentService } from '@directrent/shared/services';
import { useAuth } from '@directrent/shared/hooks';
import { formatCurrency } from '@directrent/shared/utils';

export default function PaymentScreen() {
  const { applicationId } = useLocalSearchParams();
  const { user } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank' | 'ussd' | null>(null);
  const [paystackConfig, setPaystackConfig] = useState<any>(null);
  
  useEffect(() => {
    fetchApplicationAndProperty();
  }, [applicationId]);
  
  const fetchApplicationAndProperty = async () => {
    const appDoc = await firestore().collection('applications').doc(applicationId as string).get();
    const app = appDoc.data() as Application;
    setApplication(app);
    
    const propDoc = await firestore().collection('properties').doc(app.propertyId).get();
    setProperty(propDoc.data() as Property);
    setLoading(false);
  };
  
  const breakdown = useMemo(() => {
    if (!property) return null;
    
    return {
      rent: property.pricing.annualRent,
      deposit: property.pricing.cautionDeposit,
      serviceCharge: property.pricing.serviceCharge,
      platformFee: property.pricing.platformFee,
      total: property.pricing.totalUpfront
    };
  }, [property]);
  
  const handleInitiatePayment = async () => {
    if (!breakdown || !property) return;
    
    setProcessing(true);
    
    try {
      const response = await PaymentService.initializePayment({
        amount: breakdown.total,
        email: user?.email || '',
        propertyId: property.id,
        applicationId: applicationId as string,
        type: 'combined',
        breakdown
      });
      
      setPaystackConfig({
        paystackKey: process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY,
        billingEmail: user?.email,
        amount: breakdown.total * 100,  // Kobo
        currency: 'NGN',
        reference: response.reference,
        channels: paymentMethod === 'card' ? ['card'] : 
                  paymentMethod === 'bank' ? ['bank', 'bank_transfer'] : 
                  ['ussd']
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to initialize payment. Please try again.');
      setProcessing(false);
    }
  };
  
  const handlePaymentSuccess = async (response: any) => {
    setPaystackConfig(null);
    
    try {
      // Verify payment on backend
      const verification = await PaymentService.verifyPayment(response.reference);
      
      if (verification.success) {
        Alert.alert(
          'Payment Successful! 🎉',
          'Your payment has been received. The landlord will be notified.',
          [{ text: 'View Receipt', onPress: () => router.push(`/receipt/${response.reference}`) }]
        );
      } else {
        Alert.alert('Payment Verification Failed', 'Please contact support.');
      }
    } catch (error) {
      Alert.alert('Error', 'Payment verification failed. Please contact support.');
    } finally {
      setProcessing(false);
    }
  };
  
  const handlePaymentCancel = () => {
    setPaystackConfig(null);
    setProcessing(false);
    Alert.alert('Payment Cancelled', 'Your payment was not completed.');
  };
  
  if (loading) return <LoadingScreen />;
  
  return (
    <ScrollView style={styles.container}>
      {/* Property Summary */}
      <View style={styles.propertyCard}>
        <Image source={{ uri: property?.media.photos[0]?.url }} style={styles.propertyImage} />
        <View style={styles.propertyInfo}>
          <Text style={styles.propertyTitle}>{property?.title}</Text>
          <Text style={styles.propertyLocation}>{property?.location.address}</Text>
        </View>
      </View>
      
      {/* Payment Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Breakdown</Text>
        
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Annual Rent</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(breakdown?.rent || 0)}</Text>
          </View>
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Caution Deposit</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(breakdown?.deposit || 0)}</Text>
          </View>
          
          {breakdown?.serviceCharge ? (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Service Charge</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(breakdown.serviceCharge)}</Text>
            </View>
          ) : null}
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Platform Fee (2%)</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(breakdown?.platformFee || 0)}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.breakdownRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(breakdown?.total || 0)}</Text>
          </View>
        </View>
        
        {/* Savings highlight */}
        <View style={styles.savingsCard}>
          <Text style={styles.savingsIcon}>💰</Text>
          <Text style={styles.savingsText}>
            You're saving {formatCurrency(property?.pricing.agentSavings || 0)} compared to using an agent!
          </Text>
        </View>
      </View>
      
      {/* Escrow Notice */}
      <View style={styles.escrowNotice}>
        <Text style={styles.escrowTitle}>🔒 Deposit Protection</Text>
        <Text style={styles.escrowText}>
          Your caution deposit of {formatCurrency(breakdown?.deposit || 0)} will be held securely 
          in escrow for 7 days after your move-in date. This protects both you and the landlord.
        </Text>
      </View>
      
      {/* Payment Methods */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Payment Method</Text>
        
        <TouchableOpacity
          style={[styles.paymentMethod, paymentMethod === 'card' && styles.paymentMethodSelected]}
          onPress={() => setPaymentMethod('card')}
        >
          <View style={styles.paymentMethodIcon}>
            <Icon name="credit-card" size={24} />
          </View>
          <View style={styles.paymentMethodInfo}>
            <Text style={styles.paymentMethodTitle}>Debit/Credit Card</Text>
            <Text style={styles.paymentMethodDescription}>Visa, Mastercard, Verve</Text>
          </View>
          {paymentMethod === 'card' && <Icon name="check" color={colors.primary.main} />}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.paymentMethod, paymentMethod === 'bank' && styles.paymentMethodSelected]}
          onPress={() => setPaymentMethod('bank')}
        >
          <View style={styles.paymentMethodIcon}>
            <Icon name="bank" size={24} />
          </View>
          <View style={styles.paymentMethodInfo}>
            <Text style={styles.paymentMethodTitle}>Bank Transfer</Text>
            <Text style={styles.paymentMethodDescription}>Transfer to generated account</Text>
          </View>
          {paymentMethod === 'bank' && <Icon name="check" color={colors.primary.main} />}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.paymentMethod, paymentMethod === 'ussd' && styles.paymentMethodSelected]}
          onPress={() => setPaymentMethod('ussd')}
        >
          <View style={styles.paymentMethodIcon}>
            <Icon name="phone" size={24} />
          </View>
          <View style={styles.paymentMethodInfo}>
            <Text style={styles.paymentMethodTitle}>USSD</Text>
            <Text style={styles.paymentMethodDescription}>Pay via USSD code</Text>
          </View>
          {paymentMethod === 'ussd' && <Icon name="check" color={colors.primary.main} />}
        </TouchableOpacity>
      </View>
      
      {/* Pay Button */}
      <View style={styles.footer}>
        <Button
          variant="primary"
          onPress={handleInitiatePayment}
          disabled={!paymentMethod || processing}
          loading={processing}
          fullWidth
        >
          Pay {formatCurrency(breakdown?.total || 0)}
        </Button>
        
        <Text style={styles.secureNotice}>
          🔒 Secured by Paystack
        </Text>
      </View>
      
      {/* Paystack WebView */}
      {paystackConfig && (
        <Paystack
          paystackKey={paystackConfig.paystackKey}
          billingEmail={paystackConfig.billingEmail}
          amount={paystackConfig.amount}
          currency={paystackConfig.currency}
          refNumber={paystackConfig.reference}
          channels={paystackConfig.channels}
          onCancel={handlePaymentCancel}
          onSuccess={handlePaymentSuccess}
          autoStart={true}
        />
      )}
    </ScrollView>
  );
}
```

#### 9.1.3 Cloud Functions: Payment Processing

```typescript
// Function: initializePayment
// Location: firebase/functions/src/payments/initializePayment.ts

import axios from 'axios';

const PAYSTACK_SECRET = functions.config().paystack.secret_key;

export const initializePayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const tenantId = context.auth.uid;
  const { amount, email, propertyId, applicationId, type, breakdown } = data;
  
  // Validate application exists and is accepted
  const appDoc = await firestore().collection('applications').doc(applicationId).get();
  if (!appDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Application not found');
  }
  
  const application = appDoc.data() as Application;
  if (application.status !== 'accepted') {
    throw new functions.https.HttpsError('failed-precondition', 'Application must be accepted before payment');
  }
  
  // Generate unique reference
  const reference = `DR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Initialize transaction with Paystack
  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: amount * 100,  // Kobo
        reference,
        currency: 'NGN',
        callback_url: `${functions.config().app.url}/payment/callback`,
        metadata: {
          tenantId,
          propertyId,
          applicationId,
          type,
          breakdown,
          custom_fields: [
            { display_name: 'Property', variable_name: 'property_id', value: propertyId },
            { display_name: 'Type', variable_name: 'payment_type', value: type }
          ]
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Create payment record
    await firestore().collection('payments').doc(reference).set({
      id: reference,
      tenantId,
      landlordId: application.landlordId,
      propertyId,
      applicationId,
      type,
      amount,
      currency: 'NGN',
      breakdown,
      paystack: {
        reference,
        accessCode: response.data.data.access_code,
        authorizationUrl: response.data.data.authorization_url
      },
      status: 'pending',
      createdAt: Timestamp.now()
    });
    
    return {
      authorization_url: response.data.data.authorization_url,
      access_code: response.data.data.access_code,
      reference
    };
    
  } catch (error) {
    console.error('Paystack initialization error:', error);
    throw new functions.https.HttpsError('internal', 'Payment initialization failed');
  }
});

// Function: paystackWebhook
// Location: firebase/functions/src/payments/webhook.ts

export const paystackWebhook = functions.https.onRequest(async (req, res) => {
  // Verify Paystack signature
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (hash !== req.headers['x-paystack-signature']) {
    console.error('Invalid Paystack signature');
    return res.status(401).send('Unauthorized');
  }
  
  const event = req.body;
  
  switch (event.event) {
    case 'charge.success':
      await handleChargeSuccess(event.data);
      break;
    case 'transfer.success':
      await handleTransferSuccess(event.data);
      break;
    case 'transfer.failed':
      await handleTransferFailed(event.data);
      break;
    case 'refund.processed':
      await handleRefund(event.data);
      break;
  }
  
  res.status(200).send('OK');
});

async function handleChargeSuccess(data: any) {
  const { reference, amount, channel, paid_at, metadata } = data;
  
  const paymentRef = firestore().collection('payments').doc(reference);
  const paymentDoc = await paymentRef.get();
  
  if (!paymentDoc.exists) {
    console.error(`Payment not found: ${reference}`);
    return;
  }
  
  const payment = paymentDoc.data();
  
  // Calculate escrow release date (7 days from now)
  const escrowReleaseDate = Timestamp.fromDate(addDays(new Date(), 7));
  
  // Batch update
  const batch = firestore().batch();
  
  // Update payment status
  batch.update(paymentRef, {
    status: 'completed',
    paidAt: Timestamp.fromDate(new Date(paid_at)),
    'paystack.channel': channel,
    'paystack.transactionId': data.id,
    
    // Escrow for deposit portion
    escrow: {
      status: 'held',
      heldAt: Timestamp.now(),
      releaseDate: escrowReleaseDate,
      amount: payment.breakdown.deposit
    }
  });
  
  // Create lease
  const leaseRef = firestore().collection('leases').doc();
  batch.set(leaseRef, {
    id: leaseRef.id,
    propertyId: metadata.propertyId,
    landlordId: payment.landlordId,
    tenantId: payment.tenantId,
    applicationId: metadata.applicationId,
    paymentId: reference,
    terms: {
      startDate: Timestamp.fromDate(new Date(metadata.breakdown.moveInDate || addDays(new Date(), 7))),
      endDate: Timestamp.fromDate(addYears(new Date(), 1)),
      durationMonths: 12,
      annualRent: payment.breakdown.rent,
      paymentFrequency: 'annually',
      cautionDeposit: payment.breakdown.deposit,
      serviceCharge: payment.breakdown.serviceCharge
    },
    status: 'pending_signature',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  
  // Update property status
  batch.update(firestore().collection('properties').doc(metadata.propertyId), {
    'status.availability': 'rented',
    'currentTenant.tenantId': payment.tenantId,
    'currentTenant.leaseId': leaseRef.id,
    updatedAt: Timestamp.now()
  });
  
  // Update application status
  batch.update(firestore().collection('applications').doc(metadata.applicationId), {
    status: 'completed',
    updatedAt: Timestamp.now()
  });
  
  await batch.commit();
  
  // Send notifications
  await sendPushNotification(payment.tenantId, {
    title: 'Payment Successful! 🎉',
    body: `Your payment of ${formatCurrency(amount / 100)} has been confirmed.`,
    data: { type: 'PAYMENT_SUCCESSFUL', reference, action: 'view_receipt' }
  });
  
  await sendPushNotification(payment.landlordId, {
    title: 'Payment Received! 💰',
    body: `${formatCurrency(amount / 100)} received for ${metadata.propertyTitle}`,
    data: { type: 'PAYMENT_RECEIVED', reference, propertyId: metadata.propertyId }
  });
  
  // Generate receipt
  await generateReceipt(reference);
  
  // Track analytics
  await analytics.logEvent('payment_completed', {
    amount,
    channel,
    propertyId: metadata.propertyId,
    area: metadata.area
  });
}
```

#### 9.1.4 Escrow Release Processing

```typescript
// Function: processEscrowRelease
// Location: firebase/functions/src/payments/escrowRelease.ts

export const processEscrowRelease = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async () => {
    const now = Timestamp.now();
    
    // Find payments with escrow ready for release
    const paymentsSnapshot = await firestore()
      .collection('payments')
      .where('escrow.status', '==', 'held')
      .where('escrow.releaseDate', '<=', now)
      .get();
    
    for (const doc of paymentsSnapshot.docs) {
      const payment = doc.data();
      
      // Check for disputes
      const disputeSnapshot = await firestore()
        .collection('disputes')
        .where('paymentId', '==', doc.id)
        .where('status', '==', 'open')
        .get();
      
      if (!disputeSnapshot.empty) {
        console.log(`Payment ${doc.id} has open disputes, skipping release`);
        continue;
      }
      
      try {
        // Get landlord bank details
        const landlordDoc = await firestore().collection('landlords').doc(payment.landlordId).get();
        const landlord = landlordDoc.data();
        
        if (!landlord.bankAccount?.paystackRecipientCode) {
          console.error(`Landlord ${payment.landlordId} has no bank account`);
          continue;
        }
        
        // Calculate transfer amount (deposit + rent - platform fee)
        const transferAmount = payment.amount - payment.breakdown.platformFee;
        
        // Initiate transfer
        const transferResponse = await axios.post(
          'https://api.paystack.co/transfer',
          {
            source: 'balance',
            amount: transferAmount * 100,
            recipient: landlord.bankAccount.paystackRecipientCode,
            reason: `Rent payment for property ${payment.propertyId}`,
            reference: `TR-${doc.id}-${Date.now()}`
          },
          {
            headers: {
              'Authorization': `Bearer ${PAYSTACK_SECRET}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        // Update payment record
        await doc.ref.update({
          'escrow.status': 'released',
          'escrow.releasedAt': Timestamp.now(),
          payout: {
            amount: transferAmount,
            status: 'processing',
            paystackTransferId: transferResponse.data.data.transfer_code,
            initiatedAt: Timestamp.now()
          }
        });
        
        // Notify landlord
        await sendPushNotification(payment.landlordId, {
          title: 'Funds Released! 💰',
          body: `${formatCurrency(transferAmount)} has been sent to your bank account.`,
          data: { type: 'ESCROW_RELEASED', paymentId: doc.id }
        });
        
        console.log(`Escrow released for payment ${doc.id}`);
        
      } catch (error) {
        console.error(`Failed to release escrow for ${doc.id}:`, error);
        
        // Update status
        await doc.ref.update({
          'payout.status': 'failed',
          'payout.error': error.message
        });
      }
    }
  });
```

---

# 10. Lease Management

## 10.1 Digital Lease Agreement

**Feature ID:** LEASE-001  
**Feature Name:** Digital Lease Generation and Signing  
**Assigned To:** `backend`, `frontend-tenant`, `frontend-landlord`

### User Stories

```
AS a landlord
I WANT TO generate a digital lease agreement
SO THAT I have a legally binding document without paperwork

AS a tenant
I WANT TO review and sign the lease digitally
SO THAT I can complete the rental process remotely

AS both parties
I WANT TO download the signed lease as a PDF
SO THAT I have a copy for my records
```

### Acceptance Criteria

```gherkin
Feature: Digital Lease Agreement

  Scenario: Generate lease after payment
    Given a tenant has completed payment
    When the system generates a lease
    Then it should contain:
      | Section | Contents |
      | Parties | Landlord and tenant names, BVN-verified |
      | Property | Address, type, amenities |
      | Terms | Duration, rent amount, payment schedule |
      | Deposits | Caution deposit amount and terms |
      | Rules | House rules and restrictions |
      | Termination | Notice period and conditions |
    And the lease should be in PDF format
    And it should have a unique verification QR code

  Scenario: Tenant signs lease
    Given I am a tenant with a pending lease
    When I review the lease document
    And I tap "Sign Lease"
    Then I should confirm with my PIN or biometrics
    And my digital signature should be added
    And the landlord should be notified

  Scenario: Landlord signs lease
    Given the tenant has signed the lease
    When I review and tap "Sign Lease"
    And I confirm with my PIN or biometrics
    Then my digital signature should be added
    And the lease status should change to "active"
    And both parties should receive the signed PDF
```

### Technical Specifications

#### 10.1.1 Lease Generation

```typescript
// Function: generateLease
// Location: firebase/functions/src/leases/generateLease.ts

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

interface LeaseTemplateData {
  // Parties
  landlord: {
    name: string;
    address: string;
    phone: string;
    bvnVerified: boolean;
  };
  tenant: {
    name: string;
    address: string;
    phone: string;
    bvnVerified: boolean;
  };
  
  // Property
  property: {
    address: string;
    type: string;
    description: string;
    amenities: string[];
  };
  
  // Terms
  terms: {
    startDate: Date;
    endDate: Date;
    duration: string;
    annualRent: number;
    paymentFrequency: string;
    cautionDeposit: number;
    serviceCharge: number;
  };
  
  // Rules
  rules: {
    petPolicy: string;
    maxOccupants: number;
    customRules: string[];
  };
  
  // Meta
  leaseId: string;
  generatedAt: Date;
  verificationUrl: string;
}

export const generateLease = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const { leaseId } = data;
  
  // Get lease data
  const leaseDoc = await firestore().collection('leases').doc(leaseId).get();
  if (!leaseDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Lease not found');
  }
  
  const lease = leaseDoc.data();
  
  // Get related documents
  const [landlordDoc, tenantDoc, propertyDoc] = await Promise.all([
    firestore().collection('users').doc(lease.landlordId).get(),
    firestore().collection('users').doc(lease.tenantId).get(),
    firestore().collection('properties').doc(lease.propertyId).get()
  ]);
  
  const landlord = landlordDoc.data();
  const tenant = tenantDoc.data();
  const property = propertyDoc.data();
  
  // Prepare template data
  const templateData: LeaseTemplateData = {
    landlord: {
      name: `${landlord.firstName} ${landlord.lastName}`,
      address: property.location.address,
      phone: landlord.phone,
      bvnVerified: landlord.verification.bvn.status === 'verified'
    },
    tenant: {
      name: `${tenant.firstName} ${tenant.lastName}`,
      address: '', // To be filled by tenant
      phone: tenant.phone,
      bvnVerified: tenant.verification.bvn.status === 'verified'
    },
    property: {
      address: property.location.address,
      type: property.propertyType,
      description: property.description,
      amenities: property.amenities
    },
    terms: lease.terms,
    rules: property.rules,
    leaseId,
    generatedAt: new Date(),
    verificationUrl: `https://directrent.ng/verify/${leaseId}`
  };
  
  // Generate PDF
  const pdfBuffer = await generatePDF(templateData);
  
  // Generate QR code
  const qrCodeDataUrl = await QRCode.toDataURL(templateData.verificationUrl);
  
  // Upload to Storage
  const pdfPath = `leases/${leaseId}/agreement.pdf`;
  const bucket = admin.storage().bucket();
  const file = bucket.file(pdfPath);
  
  await file.save(pdfBuffer, {
    metadata: {
      contentType: 'application/pdf'
    }
  });
  
  const [downloadUrl] = await file.getSignedUrl({
    action: 'read',
    expires: '2030-01-01'
  });
  
  // Update lease document
  await leaseDoc.ref.update({
    'documents.leaseAgreement': {
      url: downloadUrl,
      generatedAt: Timestamp.now(),
      signedByLandlord: false,
      signedByTenant: false
    },
    status: 'pending_signature',
    updatedAt: Timestamp.now()
  });
  
  return {
    success: true,
    documentUrl: downloadUrl
  };
});

async function generatePDF(data: LeaseTemplateData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    
    // Header
    doc.fontSize(20).text('TENANCY AGREEMENT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text('Facilitated by Directrent.ng', { align: 'center' });
    doc.moveDown(2);
    
    // Parties section
    doc.fontSize(14).text('1. PARTIES');
    doc.fontSize(11);
    doc.text(`LANDLORD: ${data.landlord.name}`);
    doc.text(`Phone: ${data.landlord.phone}`);
    doc.text(`Identity Verified: ${data.landlord.bvnVerified ? 'Yes (BVN)' : 'Pending'}`);
    doc.moveDown();
    doc.text(`TENANT: ${data.tenant.name}`);
    doc.text(`Phone: ${data.tenant.phone}`);
    doc.text(`Identity Verified: ${data.tenant.bvnVerified ? 'Yes (BVN)' : 'Pending'}`);
    doc.moveDown(2);
    
    // Property section
    doc.fontSize(14).text('2. PROPERTY');
    doc.fontSize(11);
    doc.text(`Address: ${data.property.address}`);
    doc.text(`Type: ${data.property.type}`);
    doc.text(`Amenities: ${data.property.amenities.join(', ')}`);
    doc.moveDown(2);
    
    // Terms section
    doc.fontSize(14).text('3. TENANCY TERMS');
    doc.fontSize(11);
    doc.text(`Commencement Date: ${formatDate(data.terms.startDate)}`);
    doc.text(`Expiry Date: ${formatDate(data.terms.endDate)}`);
    doc.text(`Duration: ${data.terms.duration}`);
    doc.text(`Annual Rent: ${formatCurrency(data.terms.annualRent)}`);
    doc.text(`Payment Frequency: ${data.terms.paymentFrequency}`);
    doc.text(`Caution Deposit: ${formatCurrency(data.terms.cautionDeposit)}`);
    if (data.terms.serviceCharge) {
      doc.text(`Service Charge: ${formatCurrency(data.terms.serviceCharge)}`);
    }
    doc.moveDown(2);
    
    // Rules section
    doc.fontSize(14).text('4. HOUSE RULES');
    doc.fontSize(11);
    doc.text(`Maximum Occupants: ${data.rules.maxOccupants}`);
    doc.text(`Pet Policy: ${data.rules.petPolicy}`);
    if (data.rules.customRules.length > 0) {
      doc.text('Additional Rules:');
      data.rules.customRules.forEach(rule => {
        doc.text(`  • ${rule}`);
      });
    }
    doc.moveDown(2);
    
    // Standard clauses
    doc.fontSize(14).text('5. STANDARD TERMS');
    doc.fontSize(11);
    doc.text('5.1 The Tenant shall use the property for residential purposes only.');
    doc.text('5.2 The Tenant shall not sublet or assign the property without written consent.');
    doc.text('5.3 The Tenant shall maintain the property in good condition.');
    doc.text('5.4 Either party may terminate with 30 days written notice.');
    doc.moveDown(2);
    
    // Signatures
    doc.fontSize(14).text('6. SIGNATURES');
    doc.moveDown();
    doc.fontSize(11);
    doc.text('LANDLORD: _______________________    Date: _______________');
    doc.moveDown();
    doc.text('TENANT: _________________________    Date: _______________');
    doc.moveDown(2);
    
    // Verification
    doc.fontSize(10).text(`Lease ID: ${data.leaseId}`, { align: 'center' });
    doc.text(`Generated: ${formatDate(data.generatedAt)}`, { align: 'center' });
    doc.text(`Verify at: ${data.verificationUrl}`, { align: 'center' });
    
    // Watermark
    doc.save();
    doc.rotate(-45, { origin: [300, 400] });
    doc.fontSize(60).fillColor('#E0E0E0').text('DIRECTRENT.NG', 150, 350);
    doc.restore();
    
    doc.end();
  });
}
```

---

# 11. Ratings & Reviews

## 11.1 Two-Way Rating System

**Feature ID:** REVIEW-001  
**Feature Name:** Landlord and Tenant Reviews  
**Assigned To:** `frontend-tenant`, `frontend-landlord`, `backend`

### User Stories

```
AS A tenant
I WANT TO rate and review my landlord after my tenancy
SO THAT future tenants can make informed decisions

AS A landlord
I WANT TO rate and review my tenants
SO THAT other landlords know about their reliability

AS a user
I WANT TO see ratings before making decisions
SO THAT I can trust the other party
```

### Technical Specifications

```typescript
// Schema: Review
// Location: packages/shared/types/review.types.ts

export interface Review {
  id: string;
  propertyId: string;
  leaseId: string;
  reviewerId: string;
  revieweeId: string;
  type: 'tenant_to_landlord' | 'landlord_to_tenant';
  
  rating: {
    overall: number;  // 1-5
    categories: {
      // For tenant_to_landlord
      communication?: number;
      propertyCondition?: number;
      maintenance?: number;
      valueForMoney?: number;
      
      // For landlord_to_tenant
      paymentTimeliness?: number;
      propertyUpkeep?: number;
      communication?: number;
      compliance?: number;
    };
  };
  
  content: {
    text: string;
    pros?: string[];
    cons?: string[];
  };
  
  status: 'published' | 'hidden' | 'flagged';
  
  response?: {
    text: string;
    respondedAt: Date;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

// Cloud Function: submitReview
export const submitReview = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  
  const reviewerId = context.auth.uid;
  const { leaseId, type, rating, content } = data;
  
  // Validate lease exists and is completed or expired
  const leaseDoc = await firestore().collection('leases').doc(leaseId).get();
  if (!leaseDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Lease not found');
  }
  
  const lease = leaseDoc.data();
  
  // Verify reviewer is a party to the lease
  if (lease.tenantId !== reviewerId && lease.landlordId !== reviewerId) {
    throw new functions.https.HttpsError('permission-denied', 'Not authorized to review this lease');
  }
  
  // Check if review already exists
  const existingReview = await firestore()
    .collection('reviews')
    .where('leaseId', '==', leaseId)
    .where('reviewerId', '==', reviewerId)
    .get();
  
  if (!existingReview.empty) {
    throw new functions.https.HttpsError('already-exists', 'You have already reviewed this tenancy');
  }
  
  // Determine reviewee
  const revieweeId = type === 'tenant_to_landlord' ? lease.landlordId : lease.tenantId;
  
  // Create review
  const reviewRef = firestore().collection('reviews').doc();
  const reviewData: Review = {
    id: reviewRef.id,
    propertyId: lease.propertyId,
    leaseId,
    reviewerId,
    revieweeId,
    type,
    rating,
    content,
    status: 'published',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };
  
  const batch = firestore().batch();
  
  batch.set(reviewRef, reviewData);
  
  // Update reviewee's rating
  const collection = type === 'tenant_to_landlord' ? 'landlords' : 'tenants';
  const revieweeDoc = await firestore().collection(collection).doc(revieweeId).get();
  const currentRating = revieweeDoc.data()?.rating || { average: 0, count: 0 };
  
  const newCount = currentRating.count + 1;
  const newAverage = ((currentRating.average * currentRating.count) + rating.overall) / newCount;
  
  batch.update(firestore().collection(collection).doc(revieweeId), {
    rating: {
      average: Math.round(newAverage * 10) / 10,
      count: newCount
    }
  });
  
  await batch.commit();
  
  // Notify reviewee
  await sendPushNotification(revieweeId, {
    title: 'New Review',
    body: `You received a ${rating.overall}★ review`,
    data: { type: 'NEW_REVIEW', reviewId: reviewRef.id }
  });
  
  return { success: true, reviewId: reviewRef.id };
});
```

---

# 12. Implementation Checklist

## Phase 1: MVP (Weeks 1-6)

### Week 1-2: Authentication & Profiles
- [ ] Phone authentication flow
- [ ] OTP verification
- [ ] Profile creation (tenant/landlord)
- [ ] BVN/NIN verification integration
- [ ] Firebase security rules

### Week 3-4: Property Management
- [ ] Create listing form (multi-step)
- [ ] Photo upload with processing
- [ ] Property search with filters
- [ ] Property details view
- [ ] Map integration

### Week 5-6: Applications & Messaging
- [ ] Rental application submission
- [ ] Application review for landlords
- [ ] Direct messaging system
- [ ] Push notifications

## Phase 2: Core Features (Weeks 7-10)

### Week 7-8: Payments
- [ ] Paystack integration
- [ ] Payment processing flow
- [ ] Escrow system for deposits
- [ ] Receipt generation

### Week 9-10: Lease Management
- [ ] Digital lease generation
- [ ] E-signature flow
- [ ] Lease status tracking
- [ ] Ratings & reviews

## Phase 3: Enhancement (Weeks 11-14)

### Week 11-12: Advanced Features
- [ ] Saved searches & alerts
- [ ] Property analytics
- [ ] Landlord subscriptions
- [ ] Featured listings

### Week 13-14: Polish & Launch
- [ ] Offline mode
- [ ] Performance optimization
- [ ] Testing & bug fixes
- [ ] App store submission

---

*End of Feature Specification*

**Document maintained by:** Directrent.ng Development Team  
**For questions:** development@directrent.ng  
**Version:** 1.0.0
