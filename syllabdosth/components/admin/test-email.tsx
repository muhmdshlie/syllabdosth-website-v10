'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { sendTestEmailAction } from '@/app/admin-actions';
import type { ActionState } from '@/lib/action-state';

export function TestEmailForm({ defaultTo }: { defaultTo: string }) {
  const [state, action] = useFormState(sendTestEmailAction, {} as ActionState);
  return (
    <form action={action} className="space-y-3">
      <p className="text-[14px] text-adm-muted">Save your settings first, then send yourself a test.</p>
      <label htmlFor="test-to" className="adm-label">Send a test email to</label>
      <input id="test-to" name="to" type="email" defaultValue={defaultTo} className="adm-input" placeholder="you@example.com" />
      <Btn />
      {state.error && <p role="alert" className="text-[13px] font-medium text-adm-red">{state.error}</p>}
      {state.ok && <p role="status" className="text-[13px] font-medium text-[#16784f]">{state.message}</p>}
    </form>
  );
}
function Btn() {
  const { pending } = useFormStatus();
  return <button type="submit" className="adm-btn-outline w-full" disabled={pending}>{pending ? 'Sending…' : 'Send test email'}</button>;
}
