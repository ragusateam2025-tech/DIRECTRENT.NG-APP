import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radius } from '../../theme/tokens';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

const OPTIONS: Array<{ role: UserRole; title: string; body: string }> = [
  {
    role: 'tenant',
    title: "I'm looking for a place",
    body: 'Browse verified listings and rent directly from property owners.',
  },
  {
    role: 'landlord',
    title: 'I have property to rent',
    body: 'List your property and reach tenants without an agent.',
  },
  {
    role: 'both',
    title: 'Both',
    body: 'Switch between renting and listing any time.',
  },
];

export default function RoleSelectionScreen() {
  const { setRole } = useAuth();
  const [selected, setSelected] = useState<UserRole>('tenant');
  const [saving, setSaving] = useState(false);

  async function handleContinue() {
    setSaving(true);
    try {
      await setRole(selected);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.wrapper}>
      <Text style={styles.title}>How will you use Directrent?</Text>
      <Text style={styles.subtitle}>You can change this later in your profile.</Text>

      <View style={styles.options}>
        {OPTIONS.map(option => {
          const isSelected = option.role === selected;
          return (
            <Pressable
              key={option.role}
              onPress={() => setSelected(option.role)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              style={[styles.option, isSelected && styles.optionSelected]}
            >
              <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                {option.title}
              </Text>
              <Text style={styles.optionBody}>{option.body}</Text>
            </Pressable>
          );
        })}
      </View>

      <Button label="Continue" onPress={handleContinue} loading={saving} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['2xl'],
    marginTop: spacing.lg,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    marginTop: spacing.xs,
  },
  options: { flex: 1, marginTop: spacing.lg },
  option: {
    backgroundColor: colors.backgroundPaper,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionSelected: { borderColor: colors.accentGold, backgroundColor: colors.backgroundElevated },
  optionTitle: {
    color: colors.textPrimary,
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.base,
  },
  optionTitleSelected: { color: colors.accentGold },
  optionBody: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
});
