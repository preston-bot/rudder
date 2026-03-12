/**
 * Local push notifications for Rudder.
 *
 * Schedules a daily reminder at a configurable time (default 07:00).
 * When a training session is scheduled for today, the notification body
 * includes the session intent so the athlete knows what they're doing.
 *
 * Persistence: notification hour/minute stored in AsyncStorage.
 * The scheduled notification is cancelled + rescheduled whenever settings change.
 *
 * REQUIRES NATIVE BUILD:
 *   npx expo prebuild --platform ios
 *   npx expo run:ios
 */

import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TrainingPlan } from '../types';

const STORAGE_KEY = 'rudder:notifications';

interface NotificationSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

const DEFAULTS: NotificationSettings = { enabled: false, hour: 7, minute: 0 };

// Handle notifications received while app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Find today's planned session intent, if any. */
function getTodayIntent(plan: TrainingPlan | null): string | null {
  if (!plan) return null;
  const todayStr = new Date().toDateString();
  const session = plan.phases
    .flatMap((p) => p.weeks.flatMap((w) => w.sessions))
    .find(
      (s) =>
        new Date(s.date).toDateString() === todayStr &&
        !s.completed &&
        !s.skipped,
    );
  return session?.intent ?? null;
}

export function useNotifications(plan: TrainingPlan | null) {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULTS);
  const [permissionStatus, setPermissionStatus] =
    useState<Notifications.PermissionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Load persisted settings and current permission status
  useEffect(() => {
    (async () => {
      const [raw, { status }] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        Notifications.getPermissionsAsync(),
      ]);
      if (raw) {
        try { setSettings(JSON.parse(raw)); } catch {}
      }
      setPermissionStatus(status);
      setLoading(false);
    })();
  }, []);

  /** Cancel all scheduled Rudder notifications. */
  async function cancelAll() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /** Schedule (or reschedule) the daily reminder. */
  const schedule = useCallback(
    async (hour: number, minute: number) => {
      await cancelAll();
      const todayIntent = getTodayIntent(plan);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Rudder',
          body: todayIntent
            ? `Today: ${todayIntent}`
            : "Time to check your training plan.",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    },
    [plan],
  );

  /** Request permission, then enable notifications. */
  const enable = useCallback(async () => {
    let status = permissionStatus;

    if (status !== 'granted') {
      const result = await Notifications.requestPermissionsAsync();
      status = result.status;
      setPermissionStatus(status);
    }

    if (status !== 'granted') return false; // user denied

    const next: NotificationSettings = { ...settings, enabled: true };
    await schedule(next.hour, next.minute);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSettings(next);
    return true;
  }, [permissionStatus, settings, schedule]);

  /** Disable and cancel all notifications. */
  const disable = useCallback(async () => {
    await cancelAll();
    const next: NotificationSettings = { ...settings, enabled: false };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSettings(next);
  }, [settings]);

  /** Update the reminder time (re-schedules immediately if enabled). */
  const setTime = useCallback(
    async (hour: number, minute: number) => {
      const next: NotificationSettings = { ...settings, hour, minute };
      if (settings.enabled) await schedule(hour, minute);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSettings(next);
    },
    [settings, schedule],
  );

  return {
    enabled: settings.enabled,
    hour: settings.hour,
    minute: settings.minute,
    permissionStatus,
    loading,
    enable,
    disable,
    setTime,
  };
}
