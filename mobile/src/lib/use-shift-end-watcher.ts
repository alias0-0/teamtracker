import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';

const AUTO_END_DELAY_MS = 20 * 60 * 1000; // 20 minutes
const CHECK_INTERVAL_MS = 30 * 1000; // check every 30s

type ZoneStatus = 'no-zone' | 'locating' | 'unknown' | 'inside' | 'outside';

export function useShiftEndWatcher(
  onShift: boolean,
  scheduledEnd: string | null,
  zoneStatus: ZoneStatus,
  onAutoEnd: () => void,
) {
  const [shiftTimeUp, setShiftTimeUp] = useState(false);
  const notifiedRef = useRef(false);
  const autoEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!onShift || !scheduledEnd) {
      setShiftTimeUp(false);
      notifiedRef.current = false;
      return;
    }

    const endTime = new Date(scheduledEnd).getTime();

    function check() {
      if (Date.now() >= endTime) {
        setShiftTimeUp(true);
        if (!notifiedRef.current) {
          notifiedRef.current = true;
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'Shift Ending',
              body: 'Your scheduled shift time has ended. End your shift or continue working overtime.',
              sound: true,
            },
            trigger: null,
          });
        }
      }
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [onShift, scheduledEnd]);

  useEffect(() => {
    if (!shiftTimeUp || !onShift) {
      if (autoEndTimerRef.current) {
        clearTimeout(autoEndTimerRef.current);
        autoEndTimerRef.current = null;
      }
      return;
    }

    if (zoneStatus === 'outside') {
      if (!autoEndTimerRef.current) {
        autoEndTimerRef.current = setTimeout(() => {
          onAutoEnd();
          autoEndTimerRef.current = null;
        }, AUTO_END_DELAY_MS);
      }
    } else if (autoEndTimerRef.current) {
      clearTimeout(autoEndTimerRef.current);
      autoEndTimerRef.current = null;
    }
  }, [shiftTimeUp, zoneStatus, onShift, onAutoEnd]);

  return { shiftTimeUp };
}