import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import type { ShiftSummary } from '@/lib/use-shift-summary';
import { colors } from '@/theme';

interface Props {
  summary: ShiftSummary | null;
  onClose: () => void;
}

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function ShiftSummaryModal({ summary, onClose }: Props) {
  if (!summary) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Shift Complete</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Duration</Text>
            <Text style={styles.value}>{formatDuration(summary.durationMinutes)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Zone</Text>
            <Text style={styles.value}>{summary.zoneName ?? 'No zone assigned'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Distance traveled</Text>
            <Text style={styles.value}>{formatDistance(summary.distanceMeters)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Started</Text>
            <Text style={styles.value}>
              {new Date(summary.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={styles.label}>Ended</Text>
            <Text style={styles.value}>
              {new Date(summary.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: 24,
  },
  title: { fontSize: 19, fontWeight: '700', color: colors.fg, marginBottom: 18, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { fontSize: 14, color: colors.muted },
  value: { fontSize: 14, fontWeight: '600', color: colors.fg },
  button: {
    marginTop: 20,
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontSize: 15, fontWeight: '600' },
});