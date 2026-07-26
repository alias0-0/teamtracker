import { useState, useRef, useEffect } from 'react';
import { useMessages } from '@/lib/use-messages';

interface Employee {
  id: string;
  name: string;
}

interface Props {
  employees: Employee[];
  initialEmployeeId?: string;
}

export function MessagesView({ employees, initialEmployeeId }: Props) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(initialEmployeeId ?? '');
  const { messages, loading, send } = useMessages(selectedEmployeeId || null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialEmployeeId) setSelectedEmployeeId(initialEmployeeId);
  }, [initialEmployeeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function handleSend() {
    if (!draft.trim()) return;
    setSending(true);
    setError('');
    const err = await send(draft);
    setSending(false);
    if (err) setError(err);
    else setDraft('');
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border p-3">
        <select
          value={selectedEmployeeId}
          onChange={(e) => setSelectedEmployeeId(e.target.value)}
          className="rounded-md border border-border px-2 py-1 text-sm"
        >
          <option value="">Select employee…</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedEmployeeId ? (
        <div className="p-5 text-sm text-muted">Select an employee to view or send messages.</div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="text-sm text-muted">Loading…</div>
            ) : messages.length === 0 ? (
              <div className="text-sm text-muted">No messages yet.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                      m.sender_role === 'admin' ? 'ml-auto bg-accent text-white' : 'mr-auto bg-surface text-fg'
                    }`}
                  >
                    <div>{m.body}</div>
                    <div className={`mt-1 text-[10px] ${m.sender_role === 'admin' ? 'text-white/70' : 'text-muted'}`}>
                      {new Date(m.created_at).toLocaleString([], {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border p-3">
            {error && <div className="mb-2 text-sm text-danger">{error}</div>}
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type a message…"
                className="flex-1 rounded-md border border-border px-3 py-2 text-sm"
              />
              <button
                onClick={handleSend}
                disabled={sending || !draft.trim()}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}