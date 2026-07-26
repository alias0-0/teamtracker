import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import type { NextSchedule } from './use-next-schedule';

const REMINDER_MINUTES_BEFORE = 30;

export function useScheduleNotifications(employeeId: string | null | undefined, nextSchedule: NextSchedule | null) {
  const scheduledIdRef = useRef<string | null>(null);

  // Alert immediately when admin assigns a new schedule
  useEffect(() => {
    if (!employeeId) return;
    const channel = supabase
      .channel('own-schedules')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'shift_schedules', filter: `employee_id=eq.${employeeId}` },
        async (payload) => {
          const row = payload.new as { scheduled_start: string };
          const start = new Date(row.scheduled_start);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'New Shift Scheduled',
              body: `You've been scheduled for ${start.toLocaleString([], {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}`,
              sound: true,
            },
            trigger: null,
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId]);

  // Schedule a reminder notification before the next shift starts
  useEffect(() => {
    (async () => {
      if (scheduledIdRef.current) {
        await Notifications.cancelScheduledNotificationAsync(scheduledIdRef.current);
        scheduledIdRef.current = null;
      }

      if (!nextSchedule) return;

      const start = new Date(nextSchedule.scheduled_start);
      const reminderTime = new Date(start.getTime() - REMINDER_MINUTES_BEFORE * 60 * 1000);
      if (reminderTime <= new Date()) return;

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Upcoming Shift',
          body: `Your shift starts in ${REMINDER_MINUTES_BEFORE} minutes`,
          sound: true,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderTime },
      });
      scheduledIdRef.current = id;
    })();
  }, [nextSchedule?.scheduled_start]);
}