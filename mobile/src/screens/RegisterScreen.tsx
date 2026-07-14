import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '@/lib/supabase';
import type { RootStackParamList } from '@/navigation';
import { colors } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [dept, setDept] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function validate(): string | null {
    if (!name.trim()) return 'Name is required';
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Enter a valid email';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return null;
  }

  async function submit() {
    const v = validate();
    if (v) return setError(v);
    setError('');
    setBusy(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError || !signUpData.user) {
      setBusy(false);
      return setError(signUpError?.message ?? 'Registration failed');
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: signUpData.user.id,
      role: 'employee',
      name: name.trim(),
      email,
      mobile: mobile.trim() || null,
      dept: dept.trim() || null,
    });

    setBusy(false);
    if (profileError) return setError(profileError.message);
    navigation.navigate('Login');
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Register</Text>

      <Field label="Name">
        <TextInput style={styles.input} value={name} onChangeText={setName} />
      </Field>
      <Field label="Email">
        <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      </Field>
      <Field label="Password">
        <TextInput style={styles.input} secureTextEntry value={password} onChangeText={setPassword} />
      </Field>
      <Field label="Mobile number">
        <TextInput style={styles.input} keyboardType="phone-pad" value={mobile} onChangeText={setMobile} />
      </Field>
      <Field label="Department">
        <TextInput style={styles.input} value={dept} onChangeText={setDept} placeholder="e.g. HVAC, Electrical" />
      </Field>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.button} onPress={submit} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? 'Registering…' : 'Register'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkWrap}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { paddingHorizontal: 24, paddingVertical: 32 },
  title: { fontSize: 22, fontWeight: '700', color: colors.fg, marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.fg, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.fg,
  },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12 },
  button: { backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  linkWrap: { marginTop: 20, alignItems: 'center' },
  link: { color: colors.accent, fontSize: 13 },
});