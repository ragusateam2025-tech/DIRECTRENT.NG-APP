import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface VerificationBadgeProps {
  verified: boolean;
  type: 'landlord' | 'tenant' | 'property';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const LABELS: Record<VerificationBadgeProps['type'], string> = {
  landlord: 'Verified Landlord',
  tenant: 'Verified Tenant',
  property: 'Verified Property',
};

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  verified,
  type,
  size = 'md',
  showText = true,
}) => {
  if (!verified) return null;

  return (
    <View style={[styles.badge, styles[`badge_${size}`]]}>
      <Text style={[styles.icon, styles[`icon_${size}`]]}>✓</Text>
      {showText && (
        <Text style={[styles.label, styles[`label_${size}`]]}>
          {LABELS[type]}
        </Text>
      )}
    </View>
  );
};

const PRIMARY = theme.colors.primary; // #1B5E20
const PRIMARY_BG = '#E8F5E9';

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_BG,
    borderRadius: 4,
  },
  icon: {
    color: PRIMARY,
    fontWeight: '700',
  },
  label: {
    color: PRIMARY,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Size variants — badge padding
  badge_sm: { paddingHorizontal: 6, paddingVertical: 2 },
  badge_md: { paddingHorizontal: 8, paddingVertical: 4 },
  badge_lg: { paddingHorizontal: 12, paddingVertical: 6 },

  // Size variants — icon font size
  icon_sm: { fontSize: 10 },
  icon_md: { fontSize: 12 },
  icon_lg: { fontSize: 14 },

  // Size variants — label font size
  label_sm: { fontSize: 10 },
  label_md: { fontSize: 12 },
  label_lg: { fontSize: 14 },
});
