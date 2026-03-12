import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  Alert,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useRaces } from '../../hooks/useRace';
import { useTrainingPlan } from '../../hooks/useWorkouts';
import { useNotifications } from '../../hooks/useNotifications';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Colors, Spacing } from '../../constants/theme';
import { formatPace } from '../../lib/workout-engine';

interface SettingsRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  right?: React.ReactNode;
}

function SettingsRow({ icon, label, value, onPress, destructive, right }: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && onPress && { opacity: 0.7 }]}
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
        {right ?? (
          <>
            {value && <Text size="sm" variant="secondary">{value}</Text>}
            {onPress && (
              <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
            )}
          </>
        )}
      </View>
    </Pressable>
  );
}

const TIME_PRESETS = [
  { label: '6:00 AM', hour: 6, minute: 0 },
  { label: '7:00 AM', hour: 7, minute: 0 },
  { label: '8:00 AM', hour: 8, minute: 0 },
  { label: '9:00 AM', hour: 9, minute: 0 },
  { label: '12:00 PM', hour: 12, minute: 0 },
];

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile(user?.id);
  const { primaryRace } = useRaces(user?.id);
  const { plan } = useTrainingPlan(primaryRace?.race_id);
  const { enabled, hour, minute, enable, disable, setTime } = useNotifications(plan ?? null);

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  function formatTime(h: number, m: number) {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  }

  async function handleNotificationToggle() {
    if (enabled) {
      Alert.alert('Daily reminders', `Currently set for ${formatTime(hour, minute)}.`, [
        {
          text: 'Change time',
          onPress: () => showTimePicker(),
        },
        { text: 'Turn off', style: 'destructive', onPress: disable },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      const granted = await enable();
      if (!granted) {
        Alert.alert(
          'Permission required',
          'Enable notifications in Settings to get daily training reminders.',
        );
      }
    }
  }

  function showTimePicker() {
    Alert.alert(
      'Reminder time',
      'When should Rudder remind you about your session?',
      [
        ...TIME_PRESETS.map((p) => ({
          text: p.label,
          onPress: () => setTime(p.hour, p.minute),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
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

        {/* Training */}
        <View style={styles.section}>
          <Text size="xs" variant="tertiary" weight="semibold" style={styles.sectionLabel}>
            TRAINING
          </Text>
          <Card>
            <SettingsRow icon="trophy-outline" label="Races" onPress={() => router.push('/races')} />
            <View style={styles.divider} />
            <SettingsRow
              icon="body-outline"
              label="Physical baseline"
              value={profile?.experience_level ? capitalize(profile.experience_level) : 'Not set'}
              onPress={() => router.push('/profile/baseline')}
            />
            <View style={styles.divider} />
            <SettingsRow
              icon="time-outline"
              label="Pool lengths used"
              value={profile?.pool_lengths?.join(', ') ?? '—'}
              onPress={() => router.push('/profile/baseline')}
            />
            <View style={styles.divider} />
            <SettingsRow
              icon="speedometer-outline"
              label="Benchmarks"
              value={profile?.critical_swim_speed ? formatPace(profile.critical_swim_speed) + ' CSS' : 'Not set'}
              onPress={() => router.push('/profile/benchmark')}
            />
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
              value="Connect"
              onPress={() => router.push('/health/workouts')}
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
            <SettingsRow
              icon="notifications-outline"
              label="Notifications"
              onPress={handleNotificationToggle}
              right={
                <View style={styles.notifRight}>
                  {enabled && (
                    <Text size="xs" variant="tertiary">{formatTime(hour, minute)}</Text>
                  )}
                  <Switch
                    value={enabled}
                    onValueChange={handleNotificationToggle}
                    trackColor={{ false: Colors.bg.tertiary, true: Colors.brand.primary }}
                    thumbColor={Colors.text.inverse}
                  />
                </View>
              }
            />
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

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
  notifRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.subtle,
  },
});
