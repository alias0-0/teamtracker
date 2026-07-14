import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { startLocationTracking, stopLocationTracking, setActiveContext } from '@/lib/location-task';
import { useSosListener } from '@/lib/sos';
import { colors } from '@/theme';

export function HomeScreen() {
  const { profile } = useAuth();
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { alert, dismiss } = useSosListener();

  const onShift = !!shiftId;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('shifts').select('id').is('ended_at', null).maybeSingle();
      const id = (data?.id as string | undefined) ?? null;
      setShiftId(id);
      if (id && profile) setActiveContext(profile.id, id);
    })();
  }, [profile]);

  useEffect(() => {
    if (!shiftId) return;
    const channel = supabase
      .channel('own-locations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'locations', filter: `shift_id=eq.${shiftId}` },
        (payload) => setLastSentAt((payload.new as { recorded_at: string }).recorded_at),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [shiftId]);

  async function start() {
    if (!profile) return;
    setError('');
    setBusy(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('start_shift');
      if (rpcError) throw rpcError;
      const newShiftId = data as unknown as string;
      setActiveContext(profile.id, newShiftId);
      await startLocationTracking();
      setShiftId(newShiftId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start shift');
    } finally {
      setBusy(false);
    }
  }

  async function end() {
    setBusy(true);
    setError('');
    try {
      await stopLocationTracking();
      const { error: rpcError } = await supabase.rpc('end_shift');
      if (rpcError) throw rpcError;
      setShiftId(null);
      setLastSentAt(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not end shift');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.flex}>
      {alert && (
        <TouchableOpacity style={styles.sosBanner} onPress={dismiss} activeOpacity={0.9}>
          <Text style={styles.sosBannerTitle}>SOS ALERT</Text>
          <Text style={styles.sosBannerMessage}>{alert.message}</Text>
          <Text style={styles.sosBannerDismiss}>Tap to dismiss</Text>
        </TouchableOpacity>
      )}

      {profile?.zone_name && (
        <View style={styles.zoneBanner}>
          <Text style={styles.zoneBannerText}>LOCATION ASSIGNED: {profile.zone_name.toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.headerName}>{profile?.name}</Text>
        <Text style={styles.headerSub}>{profile?.dept ?? 'No department'}</Text>
      </View>

      <View style={styles.center}>
        <TouchableOpacity
          onPress={onShift ? end : start}
          disabled={busy}
          style={[styles.shiftButton, { backgroundColor: onShift ? colors.danger : colors.success }]}
        >
          <Text style={styles.shiftButtonText}>
            {busy ? '...' : onShift ? 'End Shift' : 'Start Shift'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.statusText}>{onShift ? 'On Shift' : 'Off Shift'}</Text>
        <Text style={styles.statusSub}>
          {onShift
            ? lastSentAt
              ? `Last location sent ${new Date(lastSentAt).toLocaleTimeString()}`
              : 'Waiting for first location update…'
            : 'Tap the button to begin sharing your location'}
        </Text>

        {!!error && <Text style={styles.error}>{error}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 24, paddingTop: 12 },
  headerName: { fontSize: 16, fontWeight: '700', color: colors.fg },
  headerSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  shiftButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftButtonText: { color: 'white', fontSize: 22, fontWeight: '700' },
  statusText: { fontSize: 18, fontWeight: '600', color: colors.fg, marginTop: 28 },
  statusSub: { fontSize: 13, color: colors.muted, marginTop: 6, textAlign: 'center' },
  error: { color: colors.danger, fontSize: 13, marginTop: 16, textAlign: 'center' },
  sosBanner: {
    backgroundColor: colors.danger,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  sosBannerTitle: { color: 'white', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  sosBannerMessage: { color: 'white', fontSize: 15, fontWeight: '600', marginTop: 4 },
  sosBannerDismiss: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 6 },
  zoneBanner: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  zoneBannerText: { color: 'white', fontSize: 15, fontWeight: '700', textAlign: 'center' },
});