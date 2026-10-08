'use client';
import { useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { adminTicketReplyAction } from '@/app/admin-actions';
import type { ActionState } from '@/lib/action-state';
import type { TicketMessage } from '@/lib/types';
import { Icon } from './icons';
import { fmtDateTime } from './ui';

export function TicketThread({ id, status, messages }: { id: string; status: string; messages: TicketMessage[] }) {
  const [state, action] = useFormState(adminTicketReplyAction, {} as ActionState);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) form.current?.reset(); }, [state]);
  return (
    <div className="space-y-4">
      <ol className="space-y-3">
        {messages.map((m, i) => (
          <li key={i} className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.from === 'admin' ? 'ml-auto bg-adm-green-soft' : 'bg-adm-bg'}`}>
            <p className="text-[12px] font-semibold text-adm-muted">{m.name} · {fmtDateTime(m.at)}</p>
            <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed">{m.text}</p>
          </li>
        ))}
        {!messages.length && <li className="text-[14px] text-adm-muted">No messages yet.</li>}
      </ol>
      <form ref={form} action={action} className="space-y-3 border-t border-adm-line pt-4">
        {state.error && <p role="alert" className="text-[13px] font-medium text-adm-red">{state.error}</p>}
        {state.ok && <p role="status" className="text-[13px] font-medium text-[#16784f]">{state.message}</p>}
        <input type="hidden" name="id" value={id} />
        <label htmlFor="reply" className="adm-label">Reply</label>
        <textarea id="reply" name="text" rows={4} className="adm-input" placeholder="Write your reply… (the user is emailed if Email Settings are on)" />
        <div className="flex flex-wrap items-center gap-2">
          <select name="status" defaultValue="" className="adm-input !w-auto" aria-label="Set status">
            <option value="">Keep status ({status.replace('_', ' ')})</option>
            <option value="in_progress">Mark in progress</option>
            <option value="resolved">Mark resolved</option>
            <option value="closed">Close ticket</option>
            <option value="open">Reopen</option>
          </select>
          <Send />
        </div>
      </form>
    </div>
  );
}

function Send() {
  const { pending } = useFormStatus();
  return <button type="submit" className="adm-btn-primary" disabled={pending}><Icon name="send" size={18} />{pending ? 'Sending…' : 'Send reply'}</button>;
}
