import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface SosAlert {
  id: string;
  message: string;
  created_at: string;
}

/** Subscribes to new sos_broadcasts rows and surfaces them as in-app banner state
 *  + fires a local notification with sound (works foregrounded or backgrounded). */
export function useSosListener() {
  const [alert, setAlert] = useState<SosAlert | null>(null);

  useEffect(() => {
    Notifications.requestPermissionsAsync();

    const channel = supabase
      .channel('sos-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sos_broadcasts' },
        async (payload) => {
          const row = payload.new as SosAlert;
          setAlert(row);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'SOS Alert',
              body: row.message,
              sound: true,
            },
            trigger: null,
          });
        },
      )
      .subscribe((status) => console.log('SOS channel status:', status));

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { alert, dismiss: () => setAlert(null) };
}
