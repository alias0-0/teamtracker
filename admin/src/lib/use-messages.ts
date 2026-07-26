import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';

export interface Message {
  id: string;
  employee_id: string;
  sender_role: 'admin' | 'employee';
  sender_id: string;
  body: string;
  created_at: string;
}

export function useMessages(employeeId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!employeeId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('id, employee_id, sender_role, sender_id, body, created_at')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);
    setLoading(false);
  }, [employeeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!employeeId) return;
    const channel = supabase
      .channel(`messages-${employeeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `employee_id=eq.${employeeId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId]);

  async function send(body: string) {
    if (!employeeId || !body.trim()) return 'Message empty';
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 'Not signed in';

    const { error } = await supabase.from('messages').insert({
      employee_id: employeeId,
      sender_role: 'admin',
      sender_id: user.id,
      body: body.trim(),
    });
    return error?.message ?? null;
  }

  return { messages, loading, send, refresh };
}