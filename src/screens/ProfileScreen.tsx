import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../theme/tokens';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { seedListings } from '../../scripts/seed';
import type { UserRole } from '../types';

const ROLE_LABELS: Record<UserRole, string> = {
  tenant: 'Tenant',
  landlord: 'Landlord',
  both: 'Tenant & Landlord',
};

export default function ProfileScreen() {
  const { profile, logOut, setRole } = useAuth();
  const [seeding, setSeeding] = useState(false);

  if (!profile) return null;

  async function handleSeed() {
    setSeeding(true);
    try {
      const count = await seedListings();
      Alert.alert('Seeded', `${count} properties written to Firestore.`);
    } catch (err: any) {
      Alert.alert('Seeding failed', err?.message ?? 'Unknown error');
    } finally {
      setSeeding(false);
    }
  }

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

        {/* Demo tool — removed before the client sees the app (plan Task 14). */}
        <Text style={styles.sectionHeading}>Demo tools</Text>
        <Button
          label="Seed demo listings"
          variant="secondary"
          onPress={handleSeed}
          loading={seeding}
        />

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
