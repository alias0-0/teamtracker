import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { startLocationTracking, stopLocationTracking, setActiveContext } from '@/lib/location-task';
import { useSosListener } from '@/lib/sos';
import { isPointInPolygon } from '@/lib/geofence';
import { useNextSchedule } from '@/lib/use-next-schedule';
import { useScheduleNotifications } from '@/lib/use-schedule-notifications';
import { useShiftEndWatcher } from '@/lib/use-shift-end-watcher';
import { useShiftSummary } from '@/lib/use-shift-summary';
import { ShiftSummaryModal } from '@/components/ShiftSummaryModal';
import { colors } from '@/theme';

type ZoneStatus = 'no-zone' | 'locating' | 'unknown' | 'inside' | 'outside';

export function HomeScreen() {
  const { profile } = useAuth();
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [shiftStartedAt, setShiftStartedAt] = useState<string | null>(null);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [zoneBoundary, setZoneBoundary] = useState<{ lat: number; lng: number }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { alert, dismiss } = useSosListener();
  const nextSchedule = useNextSchedule(profile?.id);
  useScheduleNotifications(profile?.id, nextSchedule);
  const { summary, buildSummary, clear: clearSummary } = useShiftSummary();

  const onShift = !!shiftId;

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('shifts')
        .select('id, started_at')
        .is('ended_at', null)
        .maybeSingle();
      const id = (data?.id as string | undefined) ?? null;
      setShiftId(id);
      setShiftStartedAt((data?.started_at as string | undefined) ?? null);
      if (id && profile) await setActiveContext(profile.id, id);
    })();
  }, [profile]);

  useEffect(() => {
    if (!profile?.zone_id) {
      setZoneBoundary(null);
      return;
    }
    supabase
      .from('zones')
      .select('boundary')
      .eq('id', profile.zone_id)
      .single()
      .then(({ data }) => setZoneBoundary((data?.boundary as { lat: number; lng: number }[]) ?? null));
  }, [profile?.zone_id]);

  useEffect(() => {
    if (!shiftId) return;
    const channel = supabase
      .channel('own-locations')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'locations', filter: `shift_id=eq.${shiftId}` },
        (payload) => {
          const row = payload.new as { recorded_at: string; lat: number; lng: number };
          setLastSentAt(row.recorded_at);
          setLastCoords({ lat: row.lat, lng: row.lng });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [shiftId]);

  const zoneStatus: ZoneStatus = useMemo(() => {
    if (!profile?.zone_id) return 'no-zone';
    if (!lastCoords) return 'locating';
    if (!zoneBoundary || zoneBoundary.length < 3) return 'unknown';
    return isPointInPolygon(lastCoords, zoneBoundary) ? 'inside' : 'outside';
  }, [profile?.zone_id, lastCoords, zoneBoundary]);

  const zoneStatusLabel: Record<ZoneStatus, string> = {
    'no-zone': 'No zone assigned',
    locating: 'Locating…',
    unknown: 'Zone area not set',
    inside: 'In Zone',
    outside: 'Outside Zone',
  };

  const zoneStatusColor: Record<ZoneStatus, string> = {
    'no-zone': colors.muted,
    locating: colors.muted,
    unknown: colors.muted,
    inside: colors.success,
    outside: colors.danger,
  };

  async function start() {
    if (!profile) return;
    setError('');
    setBusy(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('start_shift');
      if (rpcError) throw rpcError;
      const newShiftId = data as unknown as string;
      await setActiveContext(profile.id, newShiftId);
      await startLocationTracking();
      await supabase
        .from('shifts')
        .update({ zone_id_snapshot: profile.zone_id, zone_boundary_snapshot: zoneBoundary })
        .eq('id', newShiftId);
      setShiftId(newShiftId);
      setShiftStartedAt(new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start shift');
    } finally {
      setBusy(false);
    }
  }

  const end = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const summaryShiftId = shiftId;
      const summaryStartedAt = shiftStartedAt;
      const summaryZoneName = profile?.zone_name ?? null;

      await stopLocationTracking();
      const { error: rpcError } = await supabase.rpc('end_shift');
      if (rpcError) throw rpcError;

      if (summaryShiftId && summaryStartedAt) {
        await buildSummary(summaryShiftId, summaryStartedAt, summaryZoneName);
      }

      setShiftId(null);
      setShiftStartedAt(null);
      setLastSentAt(null);
      setLastCoords(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not end shift');
    } finally {
      setBusy(false);
    }
  }, [shiftId, shiftStartedAt, profile?.zone_name, buildSummary]);

  const { shiftTimeUp } = useShiftEndWatcher(
    onShift,
    nextSchedule?.scheduled_end ?? null,
    zoneStatus,
    end,
  );

  return (
    <SafeAreaView style={styles.flex}>
      <ShiftSummaryModal summary={summary} onClose={clearSummary} />

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

      {shiftTimeUp && (
        <View style={styles.shiftEndBanner}>
          <Text style={styles.shiftEndBannerText}>
            SHIFT TIME ENDED — end your shift or continue overtime. Leaving your zone will auto-end it in 20 min.
          </Text>
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

        {nextSchedule && (
          <Text style={styles.statusSub}>
            Scheduled: {new Date(nextSchedule.scheduled_start).toLocaleString([], {
              weekday: 'short', hour: '2-digit', minute: '2-digit',
            })}
            {' – '}
            {new Date(nextSchedule.scheduled_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}

        {onShift && (
          <View style={[styles.zoneBadge, { borderColor: zoneStatusColor[zoneStatus] }]}>
            <View style={[styles.zoneDot, { backgroundColor: zoneStatusColor[zoneStatus] }]} />
            <Text style={[styles.zoneBadgeText, { color: zoneStatusColor[zoneStatus] }]}>
              {zoneStatusLabel[zoneStatus]}
            </Text>
          </View>
        )}

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
  zoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  zoneDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  zoneBadgeText: { fontSize: 13, fontWeight: '700' },
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
  shiftEndBanner: {
    backgroundColor: '#b45309',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  shiftEndBannerText: { color: 'white', fontSize: 13, fontWeight: '700', textAlign: 'center' },
});