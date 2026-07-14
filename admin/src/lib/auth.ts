import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface Profile {
  id: string;
  role: 'admin' | 'employee';
  name: string;
  email: string;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadProfile(userId: string) {
      const { data } = await supabase
        .from('profiles')
        .select('id, role, name, email')
        .eq('id', userId)
        .single();
      if (mounted) setProfile((data as Profile) ?? null);
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) await loadProfile(s.user.id);
      else setProfile(null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, profile, loading };
}
