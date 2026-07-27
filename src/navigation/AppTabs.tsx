import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors, typography } from '../theme/tokens';
import BrowseScreen from '../screens/BrowseScreen';
import SavedScreen from '../screens/SavedScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ListingDetailScreen from '../screens/ListingDetailScreen';

export type BrowseStackParams = {
  BrowseList: undefined;
  ListingDetail: { listingId: string };
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<BrowseStackParams>();

function BrowseStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontFamily: typography.families.heading },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="BrowseList" component={BrowseScreen} options={{ title: 'Browse' }} />
      <Stack.Screen
        name="ListingDetail"
        component={ListingDetailScreen}
        options={{ title: 'Property' }}
      />
    </Stack.Navigator>
  );
}

/** Emoji tab icons keep the demo dependency-free — no icon font to configure. */
function tabIcon(emoji: string) {
  return ({ focused }: { focused: boolean }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

export default function AppTabs() {
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
      <Tab.Screen name="Browse" component={BrowseStack} options={{ tabBarIcon: tabIcon('🏠') }} />
      <Tab.Screen name="Saved" component={SavedScreen} options={{ tabBarIcon: tabIcon('♥') }} />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ tabBarIcon: tabIcon('💬') }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: tabIcon('👤') }} />
    </Tab.Navigator>
  );
}
