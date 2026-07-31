import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors, typography } from '../theme/tokens';
import BrowseScreen from '../screens/BrowseScreen';
import SavedScreen from '../screens/SavedScreen';
import EnquiriesScreen from '../screens/EnquiriesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ListingDetailScreen from '../screens/ListingDetailScreen';
import ApplyScreen from '../screens/ApplyScreen';
import MyPropertiesScreen from '../screens/landlord/MyPropertiesScreen';
import AddPropertyScreen from '../screens/landlord/AddPropertyScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ChatScreen from '../screens/ChatScreen';
import { useAuth } from '../context/AuthContext';
import {
  IconBrowse,
  IconListings,
  IconSaved,
  IconEnquiries,
  IconMessages,
  IconProfile,
} from '../components/icons/Icon';

export type BrowseStackParams = {
  BrowseList: undefined;
  ListingDetail: { listingId: string };
  Apply: { listingId: string };
  Chat: { conversationId: string };
};

export type LandlordStackParams = {
  MyProperties: undefined;
  AddProperty: { draftId?: string };
  LandlordListingDetail: { listingId: string };
  Apply: { listingId: string };
  Chat: { conversationId: string };
};

export type MessagesStackParams = {
  MessagesList: undefined;
  Chat: { conversationId: string };
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<BrowseStackParams>();
const LandlordStack = createNativeStackNavigator<LandlordStackParams>();
const MessagesStack = createNativeStackNavigator<MessagesStackParams>();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontFamily: typography.families.heading },
  contentStyle: { backgroundColor: colors.background },
};

function BrowseStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="BrowseList" component={BrowseScreen} options={{ title: 'Browse' }} />
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
    </MessagesStack.Navigator>
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
      <Tab.Screen
        name="Enquiries"
        component={EnquiriesScreen}
        options={{ tabBarIcon: tabIcon(IconEnquiries) }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: tabIcon(IconProfile) }} />
    </Tab.Navigator>
  );
}
