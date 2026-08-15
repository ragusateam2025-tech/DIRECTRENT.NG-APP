import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors, typography } from '../theme/tokens';
import BrowseScreen from '../screens/BrowseScreen';
import SavedScreen from '../screens/SavedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ListingDetailScreen from '../screens/ListingDetailScreen';
import ApplyScreen from '../screens/ApplyScreen';
import MyPropertiesScreen from '../screens/landlord/MyPropertiesScreen';
import AddPropertyScreen from '../screens/landlord/AddPropertyScreen';
import MessagesScreen from '../screens/MessagesScreen';
import TourScreen from '../screens/TourScreen';
import TourQueueScreen from '../screens/staff/TourQueueScreen';
import AgreementScreen from '../screens/AgreementScreen';
import PaymentScreen from '../screens/PaymentScreen';
import ChatScreen from '../screens/ChatScreen';
import { useAuth } from '../context/AuthContext';
import {
  IconBrowse,
  IconListings,
  IconSaved,
  IconMessages,
  IconProfile,
} from '../components/icons/Icon';

export type BrowseStackParams = {
  BrowseList: undefined;
  ListingDetail: { listingId: string };
  Apply: { listingId: string };
  Chat: { conversationId: string };
  Agreement: { conversationId: string };
  Payment: { listingId: string };
  Tour: { embedUrl: string; title: string };
};

export type LandlordStackParams = {
  MyProperties: undefined;
  AddProperty: { draftId?: string };
  LandlordListingDetail: { listingId: string };
  Apply: { listingId: string };
  Chat: { conversationId: string };
  Agreement: { conversationId: string };
  Payment: { listingId: string };
  // An owner should be able to see the tour of their own property — it is the
  // only way they can check what was shot before a tenant does.
  Tour: { embedUrl: string; title: string };
};

export type MessagesStackParams = {
  MessagesList: undefined;
  Chat: { conversationId: string };
  Agreement: { conversationId: string };
  Payment: { listingId: string };
};

export type ProfileStackParams = {
  ProfileHome: undefined;
  /** Staff only, and gated again inside — the route existing is not permission. */
  TourQueue: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<BrowseStackParams>();
const LandlordStack = createNativeStackNavigator<LandlordStackParams>();
const MessagesStack = createNativeStackNavigator<MessagesStackParams>();
const ProfileStack = createNativeStackNavigator<ProfileStackParams>();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontFamily: typography.families.heading },
  contentStyle: { backgroundColor: colors.background },
};

function BrowseStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      {/* No header. The tab bar already says Browse, and the screen opens with
          the hero, a property count and a search field — a bar reading "Browse"
          above all three is a fourth way of saying where you are. Matches the
          Messages and Profile roots, which drop theirs for the same reason. */}
      <Stack.Screen
        name="BrowseList"
        component={BrowseScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ListingDetail"
        component={ListingDetailScreen}
        options={{ title: 'Property' }}
      />
      <Stack.Screen
        name="Apply"
        component={ApplyScreen}
        options={{ title: 'Enquire' }}
      />
      {/* Also here, not only in the Messages tab: messaging an owner starts
          from the property, and bouncing the user to another tab mid-thought
          would lose their place in the listing. */}
      <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Conversation' }} />
      <Stack.Screen
        name="Agreement"
        component={AgreementScreen}
        options={{ title: 'Tenancy agreement' }}
      />
      <Stack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ title: 'Payment' }}
      />
      <Stack.Screen
        name="Tour"
        component={TourScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </Stack.Navigator>
  );
}

function MessagesFlow() {
  return (
    <MessagesStack.Navigator screenOptions={stackScreenOptions}>
      <MessagesStack.Screen
        name="MessagesList"
        component={MessagesScreen}
        options={{ headerShown: false }}
      />
      <MessagesStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'Conversation' }}
      />
      <MessagesStack.Screen
        name="Agreement"
        component={AgreementScreen}
        options={{ title: 'Tenancy agreement' }}
      />
      <MessagesStack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ title: 'Payment' }}
      />
    </MessagesStack.Navigator>
  );
}

/**
 * Profile gained a stack only so staff have somewhere to go.
 *
 * The tour queue is not a tab. Every account would carry it in the tab bar for
 * the sake of the two or three people who can open it, and a tab bar is the
 * most expensive space in the app.
 */
function ProfileFlow() {
  return (
    <ProfileStack.Navigator screenOptions={stackScreenOptions}>
      <ProfileStack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="TourQueue"
        component={TourQueueScreen}
        options={{ title: '360 tour queue' }}
      />
    </ProfileStack.Navigator>
  );
}

function LandlordFlow() {
  return (
    <LandlordStack.Navigator screenOptions={stackScreenOptions}>
      <LandlordStack.Screen
        name="MyProperties"
        component={MyPropertiesScreen}
        options={{ title: 'My properties' }}
      />
      <LandlordStack.Screen
        name="AddProperty"
        component={AddPropertyScreen}
        options={{ title: 'Add a property', headerBackVisible: false }}
      />
      <LandlordStack.Screen
        name="LandlordListingDetail"
        component={ListingDetailScreen}
        options={{ title: 'Property' }}
      />
      {/* Reachable because a "both" account can view a listing from either
          stack; an owner viewing their own property simply never taps it. */}
      <LandlordStack.Screen
        name="Apply"
        component={ApplyScreen}
        options={{ title: 'Enquire' }}
      />
      <LandlordStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'Conversation' }}
      />
      <LandlordStack.Screen
        name="Agreement"
        component={AgreementScreen}
        options={{ title: 'Tenancy agreement' }}
      />
      <LandlordStack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ title: 'Payment' }}
      />
      <LandlordStack.Screen
        name="Tour"
        component={TourScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </LandlordStack.Navigator>
  );
}

/**
 * Tab icons carry two signals at once: the drawn glyph fills when active, and a
 * short gold rule appears above it. The fill alone is a weak signal at 22px on
 * a dark background; the rule makes the current tab unmistakable at a glance
 * without adding colour noise to the four that are not selected.
 */
function tabIcon(
  Glyph: React.ComponentType<{ size?: number; color?: string; filled?: boolean }>,
) {
  return ({ focused }: { focused: boolean }) => (
    <View style={styles.tabIcon}>
      <View style={[styles.tabRule, focused && styles.tabRuleActive]} />
      <Glyph
        size={22}
        color={focused ? colors.accentGold : colors.textMuted}
        filled={focused}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabIcon: { alignItems: 'center', justifyContent: 'center' },
  tabRule: {
    width: 16,
    height: 2,
    borderRadius: 1,
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  tabRuleActive: { backgroundColor: colors.accentGold },
});

export default function AppTabs() {
  const { profile } = useAuth();

  // Tabs follow the chosen role. A tenant has no reason to see My Properties,
  // and an owner-only account has no reason to see Saved.
  const isTenant = profile?.role === 'tenant' || profile?.role === 'both';
  const isLandlord = profile?.role === 'landlord' || profile?.role === 'both';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.backgroundPaper,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accentGold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: typography.families.bodyMedium,
          fontSize: typography.sizes.xs,
        },
      }}
    >
      {isTenant && (
        <Tab.Screen name="Browse" component={BrowseStack} options={{ tabBarIcon: tabIcon(IconBrowse) }} />
      )}
      {isLandlord && (
        <Tab.Screen
          name="Listings"
          component={LandlordFlow}
          options={{ tabBarIcon: tabIcon(IconListings) }}
        />
      )}
      {isTenant && (
        <Tab.Screen name="Saved" component={SavedScreen} options={{ tabBarIcon: tabIcon(IconSaved) }} />
      )}
      <Tab.Screen
        name="Messages"
        component={MessagesFlow}
        options={{ tabBarIcon: tabIcon(IconMessages) }}
      />
      {/* Enquiries was a tab until it turned out to be the same thing as
          Messages. An enquiry is the first message of a conversation, so it now
          opens one — and accepting or declining happens inside the thread it
          belongs to rather than on a screen of its own. */}
      <Tab.Screen name="Profile" component={ProfileFlow} options={{ tabBarIcon: tabIcon(IconProfile) }} />
    </Tab.Navigator>
  );
}
