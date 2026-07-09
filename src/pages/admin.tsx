import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { LogOut, MapPin, Users, Activity, Zap } from 'lucide-react';

export function Admin() {
  const { profile } = useAuth();
  return (
    <div className="min-h-screen">
      <nav className="glass sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary shadow-lg shadow-primary/30">
              <MapPin className="h-4 w-4 text-black" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-sm font-semibold leading-none">Team Tracker</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">Admin dashboard</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Hi, {profile?.name ?? 'Admin'}</span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat icon={<Users className="h-5 w-5" />} label="On shift" value="—" />
          <Stat icon={<Activity className="h-5 w-5" />} label="Available" value="—" />
          <Stat icon={<Zap className="h-5 w-5" />} label="Response rate" value="—" />
          <Stat icon={<MapPin className="h-5 w-5" />} label="Areas" value="—" />
        </div>

        <div className="glass grid h-96 place-items-center rounded-2xl text-center">
          <div>
            <div className="mb-2 text-sm font-medium">Live map</div>
            <div className="text-xs text-muted-foreground">Leaflet + employee pins land here next</div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
