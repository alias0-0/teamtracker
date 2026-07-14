import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from './supabase';

export const LOCATION_TASK = 'team-tracker-location-task';

// Defined once at module load — required by expo-task-manager.
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('Location task error:', error);
    return;
  }
  const { locations } = (data as { locations: Location.LocationObject[] }) ?? { locations: [] };
  const loc = locations?.[0];
  if (!loc) return;

  const userId = await getStoredUserId();
  const shiftId = await getStoredShiftId();
  if (!userId || !shiftId) return;

  await supabase.from('locations').insert({
    user_id: userId,
    shift_id: shiftId,
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
  });
});

// Simple in-memory + module-level cache so the background task (which runs
// outside React) can read the active user/shift without React state.
let cachedUserId: string | null = null;
let cachedShiftId: string | null = null;

export function setActiveContext(userId: string | null, shiftId: string | null) {
  cachedUserId = userId;
  cachedShiftId = shiftId;
}
async function getStoredUserId() {
  return cachedUserId;
}
async function getStoredShiftId() {
  return cachedShiftId;
}

/** Request permissions, then start foreground + background updates. */
export async function startLocationTracking() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') throw new Error('Foreground location permission denied');

  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') throw new Error('Background location permission denied');

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5 * 60 * 1000, // 5 minutes
    distanceInterval: 0, // or every 50m moved
    foregroundService: {
      notificationTitle: 'Team Tracker',
      notificationBody: 'Sharing your location while on shift',
    },
    showsBackgroundLocationIndicator: true,
  });
}

export async function stopLocationTracking() {
  const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
  if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  setActiveContext(null, null);
}
