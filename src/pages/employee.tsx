import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { LogOut, Play, Square, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export function Employee() {
  const { profile } = useAuth();
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('shifts')
        .select('id')
        .is('ended_at', null)
        .maybeSingle();
      setActiveShiftId((data?.id as string | undefined) ?? null);
    })();
  }, []);

  async function start() {
    setBusy(true);
    const { data, error } = await supabase.rpc('start_shift');
    setBusy(false);
    if (error) return toast.error(error.message);
    setActiveShiftId(data as unknown as string);
    toast.success('Shift started');
  }

  async function end() {
    setBusy(true);
    const { error } = await supabase.rpc('end_shift');
    setBusy(false);
    if (error) return toast.error(error.message);
    setActiveShiftId(null);
    toast.success('Shift ended');
  }

  const onShift = !!activeShiftId;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{profile?.name ?? 'Employee'}</div>
          <div className="text-xs text-muted-foreground">Field worker</div>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground hover:bg-white/5 hover:text-white"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <div className="glass mt-6 flex flex-1 flex-col items-center justify-center rounded-3xl p-8 text-center">
        <div
          className={`mb-6 grid h-24 w-24 place-items-center rounded-full ${
            onShift ? 'bg-primary/15 text-primary' : 'bg-white/5 text-muted-foreground'
          }`}
        >
          {onShift ? <Square className="h-9 w-9" /> : <Play className="h-9 w-9 translate-x-0.5" />}
        </div>
        <div className="text-lg font-semibold">{onShift ? "You're on shift" : 'Not on shift'}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {onShift ? 'Location shared with your dispatcher' : 'Tap to start sharing location'}
        </div>

        <button
          onClick={onShift ? end : start}
          disabled={busy}
          className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-base font-medium transition-all disabled:opacity-50 ${
            onShift
              ? 'bg-red-500/90 text-white hover:bg-red-500'
              : 'bg-primary text-black shadow-lg shadow-primary/30 hover:bg-primary/90'
          }`}
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : onShift ? 'End shift' : 'Start shift'}
        </button>
      </div>
    </div>
  );
}
