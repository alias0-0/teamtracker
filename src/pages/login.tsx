import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';

type Tab = 'admin' | 'employee';

export function Login() {
  const [tab, setTab] = useState<Tab>('admin');
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-2xl p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary shadow-lg shadow-primary/30">
            <MapPin className="h-5 w-5 text-black" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-semibold">Team Tracker</div>
            <div className="text-xs text-muted-foreground">Sign in to continue</div>
          </div>
        </div>

        <div className="mb-6 flex gap-1 rounded-lg bg-white/5 p-1">
          <TabBtn active={tab === 'admin'} onClick={() => setTab('admin')}>Admin</TabBtn>
          <TabBtn active={tab === 'employee'} onClick={() => setTab('employee')}>Employee</TabBtn>
        </div>

        {tab === 'admin' ? <AdminLogin onDone={() => navigate('/admin')} /> : <EmployeeLogin onDone={() => navigate('/shift')} />}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all',
        active ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white',
      )}
    >
      {children}
    </button>
  );
}

function AdminLogin({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Email">
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="admin@example.com" />
      </Field>
      <Field label="Password">
        <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
      </Field>
      <button type="submit" disabled={busy} className={btnCls}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in'}
      </button>
    </form>
  );
}

function EmployeeLogin({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Code sent');
    setStep('otp');
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
    setBusy(false);
    if (error) return toast.error(error.message);
    onDone();
  }

  if (step === 'phone') {
    return (
      <form onSubmit={sendCode} className="space-y-3">
        <Field label="Mobile number">
          <input type="tel" required autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+966 5X XXX XXXX" />
        </Field>
        <button type="submit" disabled={busy} className={btnCls}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send code'}
        </button>
        <p className="text-xs text-muted-foreground">
          Requires Twilio configured in Supabase → Auth → Phone. See README.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="space-y-3">
      <Field label="6-digit code">
        <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value)} className={cn(inputCls, 'text-center text-lg tracking-widest')} />
      </Field>
      <button type="submit" disabled={busy} className={btnCls}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
      </button>
      <button type="button" onClick={() => setStep('phone')} className="w-full text-xs text-muted-foreground hover:text-white">
        ← Use a different number
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full rounded-lg border border-border bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20';
const btnCls =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-black shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 disabled:opacity-50';
