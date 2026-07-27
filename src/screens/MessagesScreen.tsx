import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/tokens';
import EmptyState from '../components/EmptyState';

export default function MessagesScreen() {
  return (
    <View style={styles.wrapper}>
      <EmptyState
        icon="💬"
        title="No messages yet"
        body="When you contact a landlord about a property, your conversations will appear here."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
});
