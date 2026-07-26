import { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useMyShiftHistory, type MyShiftEntry } from '@/lib/use-my-shift-history';
import { colors } from '@/theme';

function formatDuration(startIso: string, endIso: string | null) {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const mins = Math.round((end - start) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export function ShiftHistoryScreen() {
  const { shifts, loading, load } = useMyShiftHistory();

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.flex}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : shifts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No shift history yet.</Text>
        </View>
      ) : (
        <FlatList
          data={shifts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }: { item: MyShiftEntry }) => (
            <View style={styles.row}>
              <Text style={styles.rowDate}>{new Date(item.started_at).toLocaleDateString()}</Text>
              <Text style={styles.rowTime}>
                {new Date(item.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' – '}
                {item.ended_at
                  ? new Date(item.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'In progress'}
              </Text>
              <Text style={styles.rowDuration}>{formatDuration(item.started_at, item.ended_at)}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: colors.muted },
  list: { paddingHorizontal: 20, paddingVertical: 12 },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowDate: { fontSize: 15, fontWeight: '700', color: colors.fg },
  rowTime: { fontSize: 13, color: colors.muted, marginTop: 2 },
  rowDuration: { fontSize: 13, color: colors.accent, marginTop: 4, fontWeight: '600' },
});