import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme';

export function ProfileScreen() {
  const { profile } = useAuth();

  return (
    <SafeAreaView style={styles.flex}>
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>

        <Row label="Name" value={profile?.name ?? '—'} />
        <Row label="Email" value={profile?.email ?? '—'} />
        <Row label="Mobile" value={profile?.mobile ?? '—'} />
        <Row label="Department" value={profile?.dept ?? '—'} />

        <TouchableOpacity style={styles.button} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.buttonText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { paddingHorizontal: 24, paddingTop: 24 },
  title: { fontSize: 22, fontWeight: '700', color: colors.fg, marginBottom: 24 },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  rowValue: { fontSize: 15, color: colors.fg },
  button: {
    marginTop: 32,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
});
