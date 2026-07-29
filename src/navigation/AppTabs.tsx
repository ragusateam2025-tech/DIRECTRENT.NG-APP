import React from 'react';
import { Text } from 'react-native';
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
import { useAuth } from '../context/AuthContext';

export type BrowseStackParams = {
  BrowseList: undefined;
  ListingDetail: { listingId: string };
  Apply: { listingId: string };
};

export type LandlordStackParams = {
  MyProperties: undefined;
  AddProperty: { draftId?: string };
  LandlordListingDetail: { listingId: string };
  Apply: { listingId: string };
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<BrowseStackParams>();
const LandlordStack = createNativeStackNavigator<LandlordStackParams>();

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
    </Stack.Navigator>
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
          stack; a landlord viewing their own property simply never taps it. */}
      <LandlordStack.Screen
        name="Apply"
        component={ApplyScreen}
        options={{ title: 'Enquire' }}
      />
    </LandlordStack.Navigator>
  );
}

/** Emoji tab icons keep the app dependency-free — no icon font to configure. */
function tabIcon(emoji: string) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

export default function AppTabs() {
  const { profile } = useAuth();

  // Tabs follow the chosen role. A tenant has no reason to see My Properties,
  // and a landlord-only account has no reason to see Saved.
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
        <Tab.Screen name="Browse" component={BrowseStack} options={{ tabBarIcon: tabIcon('🏠') }} />
      )}
      {isLandlord && (
        <Tab.Screen
          name="Listings"
          component={LandlordFlow}
          options={{ tabBarIcon: tabIcon('🏘️') }}
        />
      )}
      {isTenant && (
        <Tab.Screen name="Saved" component={SavedScreen} options={{ tabBarIcon: tabIcon('♥') }} />
      )}
      <Tab.Screen
        name="Enquiries"
        component={EnquiriesScreen}
        options={{ tabBarIcon: tabIcon('✉️') }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: tabIcon('👤') }} />
    </Tab.Navigator>
  );
}
