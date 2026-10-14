'use client';

import { useState } from 'react';
import { addCommissionAction } from '@/app/admin-wallet-actions';
import type { ActionState } from '@/lib/action-state';

type Franchise = { id: string; name: string };

const field = 'mt-1.5 w-full rounded-xl border border-adm-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-adm-green';

export function CommissionForm({ franchises }: { franchises: Franchise[] }) {
  const [state, setState] = useState<ActionState>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    setPending(true);
    setState({});
    try {
      const result = await addCommissionAction({}, new FormData(form));
      setState(result);
      if (result.ok) form.reset();
    } catch {
      setState({ error: 'Network error. Please try again.' });
    } finally {
      setPending(false);
    }
  }

  const disabled = pending || franchises.length === 0;

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <label className="text-[14px] font-medium">
        Franchise
        <select name="organisation_id" required disabled={disabled} defaultValue="" className={field}>
          <option value="" disabled>{franchises.length ? 'Choose a franchise' : 'No franchises yet'}</option>
          {franchises.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </label>

      <label className="text-[14px] font-medium">
        Commission for
        <select name="source_type" required disabled={disabled} defaultValue="" className={field}>
          <option value="" disabled>Choose</option>
          <option value="enrollment">Course enrolment</option>
          <option value="booking">Service booking</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label className="text-[14px] font-medium">
        Enrolment or booking reference
        <input name="source_ref" required maxLength={100} disabled={disabled} placeholder="e.g. the enquiry ID" className={field} />
      </label>

      <label className="text-[14px] font-medium">
        Amount (₹)
        <input name="amount" required inputMode="decimal" disabled={disabled} placeholder="e.g. 1500" className={field} />
      </label>

      <label className="text-[14px] font-medium md:col-span-2">
        Note (optional)
        <textarea name="note" rows={2} maxLength={300} disabled={disabled} className={field} />
      </label>

      {state.error && <p role="alert" className="rounded-xl border border-adm-red/30 bg-adm-red-soft px-4 py-3 text-[14px] font-medium text-[#b3321a] md:col-span-2">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-xl border border-adm-green/30 bg-adm-green-soft px-4 py-3 text-[14px] font-medium text-[#16784f] md:col-span-2">{state.message}</p>}

      <div className="md:col-span-2">
        <button type="submit" disabled={disabled} className="adm-btn-primary disabled:opacity-60">
          {pending ? 'Recording…' : 'Record commission'}
        </button>
      </div>
    </form>
  );
}
