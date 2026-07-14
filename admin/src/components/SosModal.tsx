import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  adminId: string;
  onClose: () => void;
}

export function SosModal({ adminId, onClose }: Props) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send() {
    if (!message.trim()) return;
    setBusy(true);
    setError('');
    const { error } = await supabase
      .from('sos_broadcasts')
      .insert({ admin_id: adminId, message: message.trim() });
    setBusy(false);
    if (error) return setError(error.message);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-bg p-6 shadow-lg">
        <div className="mb-1 text-lg font-semibold text-danger">Send SOS</div>
        <div className="mb-4 text-sm text-muted">
          This alerts every registered employee immediately.
        </div>

        <label className="mb-1 block text-sm font-medium">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          placeholder="Describe the emergency or urgent request…"
        />

        {error && <div className="mt-2 text-sm text-danger">{error}</div>}

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={send}
            disabled={busy || !message.trim()}
            className="flex-1 rounded-md bg-danger px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Confirm & Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
