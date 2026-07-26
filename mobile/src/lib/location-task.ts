import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export const LOCATION_TASK = 'team-tracker-location-task';

const USER_ID_KEY = 'active_user_id';
const SHIFT_ID_KEY = 'active_shift_id';
const LAST_SENT_KEY = 'last_location_sent_at';
const MIN_GAP_MS = 4 * 60 * 1000; // hard floor between sends, even if OS fires more often

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('Location task error:', error);
    return;
  }
  const { locations } = (data as { locations: Location.LocationObject[] }) ?? { locations: [] };
  const loc = locations?.[0];
  if (!loc) return;

  const userId = await AsyncStorage.getItem(USER_ID_KEY);
  const shiftId = await AsyncStorage.getItem(SHIFT_ID_KEY);
  if (!userId || !shiftId) return;

  const lastSentStr = await AsyncStorage.getItem(LAST_SENT_KEY);
  if (lastSentStr) {
    const elapsed = Date.now() - parseInt(lastSentStr, 10);
    if (elapsed < MIN_GAP_MS) return;
  }

  await supabase.from('locations').insert({
    user_id: userId,
    shift_id: shiftId,
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
  });

  await AsyncStorage.setItem(LAST_SENT_KEY, Date.now().toString());
});

export async function setActiveContext(userId: string | null, shiftId: string | null) {
  if (userId && shiftId) {
    await AsyncStorage.setItem(USER_ID_KEY, userId);
    await AsyncStorage.setItem(SHIFT_ID_KEY, shiftId);
    await AsyncStorage.removeItem(LAST_SENT_KEY);
  } else {
    await AsyncStorage.removeItem(USER_ID_KEY);
    await AsyncStorage.removeItem(SHIFT_ID_KEY);
    await AsyncStorage.removeItem(LAST_SENT_KEY);
  }
}

export async function startLocationTracking() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') throw new Error('Foreground location permission denied');

  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') throw new Error('Background location permission denied');

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5 * 60 * 1000,
    distanceInterval: 0,
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
  await setActiveContext(null, null);
}