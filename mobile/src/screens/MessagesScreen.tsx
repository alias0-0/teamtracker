import { useRef, useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useAuth } from '@/lib/auth';
import { useOwnMessages } from '@/lib/use-own-messages';
import { colors } from '@/theme';

export function MessagesScreen() {
  const { profile } = useAuth();
  const { messages, loading, send } = useOwnMessages(profile?.id);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  async function handleSend() {
    if (!draft.trim()) return;
    setSending(true);
    await send(draft);
    setSending(false);
    setDraft('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
      >
        {loading ? (
          <View style={styles.center}>
            <Text style={{ color: colors.muted }}>Loading…</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            renderItem={({ item }) => (
              <View style={[styles.bubble, item.sender_role === 'employee' ? styles.bubbleSelf : styles.bubbleAdmin]}>
                <Text style={item.sender_role === 'employee' ? styles.bubbleTextSelf : styles.bubbleTextAdmin}>
                  {item.body}
                </Text>
                <Text style={styles.bubbleTime}>
                  {new Date(item.created_at).toLocaleString([], {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={{ color: colors.muted }}>No messages yet.</Text>
              </View>
            }
          />
        )}

        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message…"
            multiline
          />
          <TouchableOpacity onPress={handleSend} disabled={sending || !draft.trim()} style={styles.sendButton}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  listContent: { padding: 16, gap: 8, flexGrow: 1 },
  bubble: { maxWidth: '75%', borderRadius: 12, padding: 10, marginBottom: 4 },
  bubbleSelf: { alignSelf: 'flex-end', backgroundColor: colors.accent },
  bubbleAdmin: { alignSelf: 'flex-start', backgroundColor: colors.surface },
  bubbleTextSelf: { color: 'white', fontSize: 14 },
  bubbleTextAdmin: { color: colors.fg, fontSize: 14 },
  bubbleTime: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: { backgroundColor: colors.accent, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  sendButtonText: { color: 'white', fontWeight: '600', fontSize: 14 },
});