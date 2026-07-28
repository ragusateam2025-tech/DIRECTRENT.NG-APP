import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing, radius } from '../../theme/tokens';
import Button from '../../components/Button';
import { formatNaira } from '../../lib/format';
import type { AuthStackParams } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<AuthStackParams, 'Welcome'>;

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.wrapper}>
      <View style={styles.hero}>
        <Text style={styles.wordmark}>
          <Text style={styles.direct}>Direct</Text>
          <Text style={styles.rent}>rent</Text>
        </Text>

        <Text style={styles.headline}>Rent directly.{'\n'}Keep your money.</Text>

        <View style={styles.savingsPill}>
          <Text style={styles.savingsPillText}>
            Save from {formatNaira(300000)} in rental fees
          </Text>
        </View>

        <Text style={styles.body}>
          The Agent Effect costs Lagos renters hundreds of thousands of naira in
          fees that buy them nothing. We connect you straight to verified
          landlords — no middleman, no inflated charges.
        </Text>

        <Text style={styles.research}>
          Based on primary research with 70 Lagos residents
        </Text>
      </View>

      <View style={styles.actions}>
        <Button label="Create an account" onPress={() => navigation.navigate('SignUp')} />
        <View style={styles.spacer} />
        <Button
          label="I already have an account"
          variant="secondary"
          onPress={() => navigation.navigate('LogIn')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  hero: { flex: 1, justifyContent: 'center' },
  wordmark: { fontSize: typography.sizes['4xl'], fontFamily: typography.families.display },
  direct: { color: colors.textPrimary },
  rent: { color: colors.accentGold },
  headline: {
    color: colors.textPrimary,
    fontFamily: typography.families.display,
    fontSize: typography.sizes['3xl'],
    marginTop: spacing.lg,
    lineHeight: 38,
  },
  savingsPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentCoral,
    borderRadius: radius.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  savingsPillText: {
    color: colors.textPrimary,
    fontFamily: typography.families.bodySemiBold,
    fontSize: typography.sizes.sm,
  },
  body: {
    color: colors.textSecondary,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.base,
    lineHeight: 24,
    marginTop: spacing.lg,
  },
  research: {
    color: colors.textMuted,
    fontFamily: typography.families.body,
    fontSize: typography.sizes.xs,
    marginTop: spacing.md,
  },
  actions: { paddingBottom: spacing.md },
  spacer: { height: spacing.sm },
});
