import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../theme/tokens';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

const ROLE_LABELS: Record<UserRole, string> = {
  tenant: 'Tenant',
  landlord: 'Landlord',
  both: 'Tenant & Landlord',
};

export default function ProfileScreen() {
  const { profile, logOut, setRole } = useAuth();

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile.fullName.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>

        <Text style={styles.name}>{profile.fullName}</Text>
        <Text style={styles.email}>{profile.email}</Text>

        <Text style={styles.sectionHeading}>Your role</Text>
        <View style={styles.roleRow}>
          {(['tenant', 'landlord', 'both'] as UserRole[]).map(role => (
            <Pressable
              key={role}
              onPress={() => setRole(role)}
              style={[styles.rolePill, profile.role === role && styles.rolePillActive]}
            >
              <Text
                style={[styles.rolePillText, profile.role === role && styles.rolePillTextActive]}
              >
                {ROLE_LABELS[role]}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.logout}>
          <Button label="Log out" onPress={logOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, alignItems: 'stretch' },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentGoldDark,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.lg,
  },
  avatarText: {
    color: colors.primaryDark,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['3xl'],
  },
  name: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['2xl'],
    textAlign: 'center',
    marginTop: spacing.md,
  },
  email: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  sectionHeading: {
    color: colors.textPrimary,
    fontFamily: typography.families.heading,
    fontSize: typography.sizes.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap' },
  rolePill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  rolePillActive: { borderColor: colors.accentGold, backgroundColor: colors.backgroundElevated },
  rolePillText: {
    color: colors.textSecondary,
    fontFamily: typography.families.bodyMedium,
    fontSize: typography.sizes.sm,
  },
  rolePillTextActive: { color: colors.accentGold },
  logout: { marginTop: spacing.xl },
});
