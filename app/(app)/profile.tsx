import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Colors, Spacing } from '../../constants/theme';

interface SettingsRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}

function SettingsRow({ icon, label, value, onPress, destructive }: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.rowLeft}>
        <Ionicons
          name={icon as any}
          size={20}
          color={destructive ? Colors.error : Colors.text.secondary}
        />
        <Text size="md" style={destructive ? { color: Colors.error } : undefined}>
          {label}
        </Text>
      </View>
      <View style={styles.rowRight}>
        {value && <Text size="sm" variant="secondary">{value}</Text>}
        {onPress && (
          <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
        )}
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: signOut,
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text size="xs" variant="secondary" weight="semibold" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
          Profile
        </Text>

        {/* Identity card */}
        <Card style={styles.identityCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={28} color={Colors.brand.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text size="lg" weight="semibold">{user?.email ?? 'Swimmer'}</Text>
            <Text size="sm" variant="secondary">{user?.app_metadata?.provider ?? 'signed in'}</Text>
          </View>
        </Card>

        {/* Training settings */}
        <View style={styles.section}>
          <Text size="xs" variant="tertiary" weight="semibold" style={styles.sectionLabel}>
            TRAINING
          </Text>
          <Card>
            <SettingsRow icon="trophy-outline" label="Races" onPress={() => {}} />
            <View style={styles.divider} />
            <SettingsRow icon="body-outline" label="Physical baseline" onPress={() => {}} />
            <View style={styles.divider} />
            <SettingsRow icon="time-outline" label="Pool lengths used" value="25y, 25m" onPress={() => {}} />
            <View style={styles.divider} />
            <SettingsRow icon="speedometer-outline" label="Benchmarks" onPress={() => {}} />
          </Card>
        </View>

        {/* Devices */}
        <View style={styles.section}>
          <Text size="xs" variant="tertiary" weight="semibold" style={styles.sectionLabel}>
            DEVICES
          </Text>
          <Card>
            <SettingsRow
              icon="watch-outline"
              label="Apple Health"
              value="Not connected"
              onPress={() => {}}
            />
            <View style={styles.divider} />
            <SettingsRow
              icon="fitness-outline"
              label="Garmin Connect"
              value="Not connected"
              onPress={() => {}}
            />
          </Card>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text size="xs" variant="tertiary" weight="semibold" style={styles.sectionLabel}>
            PREFERENCES
          </Text>
          <Card>
            <SettingsRow icon="resize-outline" label="Units" value="Meters" onPress={() => {}} />
            <View style={styles.divider} />
            <SettingsRow icon="notifications-outline" label="Notifications" onPress={() => {}} />
          </Card>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text size="xs" variant="tertiary" weight="semibold" style={styles.sectionLabel}>
            ACCOUNT
          </Text>
          <Card>
            <SettingsRow icon="star-outline" label="Subscription" value="Free" onPress={() => {}} />
            <View style={styles.divider} />
            <SettingsRow icon="document-text-outline" label="Terms & Privacy" onPress={() => {}} />
            <View style={styles.divider} />
            <SettingsRow icon="log-out-outline" label="Sign out" onPress={handleSignOut} destructive />
          </Card>
        </View>

        <Text size="xs" variant="tertiary" align="center">
          Rudder v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  scroll: {
    padding: Spacing['6'],
    gap: Spacing['4'],
    paddingBottom: Spacing['10'],
  },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['4'],
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.bg.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    gap: Spacing['2'],
  },
  sectionLabel: {
    letterSpacing: 1,
    marginLeft: Spacing['1'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing['3'],
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.subtle,
  },
});
