'use client';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import type { ActionState } from '@/lib/action-state';

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

/** Form bound to a server action; shows the action's error/success message. */
export function ActionForm({ action, children, className, successSlot }: { action: Action; children: ReactNode; className?: string; successSlot?: ReactNode }) {
  const [state, formAction] = useFormState(action, {} as ActionState);
  if (state.ok && successSlot) return <>{successSlot}</>;
  return (
    <form action={formAction} className={className} noValidate={false}>
      {state.error && (
        <p role="alert" className="mb-5 rounded-xl bg-[#FDE7E4] px-4 py-3 text-[14px] font-medium text-[#8A1F11]">
          {state.error}
        </p>
      )}
      {state.ok && state.message && (
        <p role="status" className="mb-5 rounded-xl bg-soft px-4 py-3 text-[14px] font-medium text-ink">
          {state.message}
        </p>
      )}
      {children}
    </form>
  );
}

export function SubmitButton({ children, variant = 'primary', className, pendingText = 'Sending…' }: { children: ReactNode; variant?: 'primary' | 'dark' | 'secondary'; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={clsx(`btn-${variant}`, className)}>
      {pending ? pendingText : children}
    </button>
  );
}

type FieldProps = { label: string; name: string; type?: string; placeholder?: string; required?: boolean; defaultValue?: string | number; className?: string; min?: string | number; autoComplete?: string; hint?: string; inputMode?: 'numeric' | 'tel' | 'email' | 'text' };

export function Field({ label, name, type = 'text', className, hint, ...rest }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label} {!rest.required && <span className="font-normal text-ink-soft">(optional)</span>}
      </label>
      <input id={name} name={name} type={type} className="input" {...rest} />
      {hint && <p className="mt-1.5 text-[12px] text-ink-soft">{hint}</p>}
    </div>
  );
}

export function TextArea({ label, name, placeholder, required, rows = 4, className, defaultValue }: { label: string; name: string; placeholder?: string; required?: boolean; rows?: number; className?: string; defaultValue?: string }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label} {!required && <span className="font-normal text-ink-soft">(optional)</span>}
      </label>
      <textarea id={name} name={name} rows={rows} placeholder={placeholder} required={required} defaultValue={defaultValue} className="input resize-y" />
    </div>
  );
}

export function SelectField({ label, name, options, required, className, defaultValue }: { label: string; name: string; options: { value: string; label: string }[]; required?: boolean; className?: string; defaultValue?: string }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">{label}</label>
      <select id={name} name={name} required={required} defaultValue={defaultValue} className="input appearance-none bg-no-repeat pr-10" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24'><path d='M6 9l6 6 6-6' stroke='%23111311' stroke-width='2' fill='none'/></svg>\")", backgroundPosition: "right 1rem center" }}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

/** Small inline form for status buttons in dashboards. */
export function InlineAction({ action, children, fields, variant = 'secondary' }: { action: (fd: FormData) => Promise<void>; children: ReactNode; fields: Record<string, string>; variant?: 'primary' | 'secondary' | 'dark' }) {
  return (
    <form action={action}>
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <SmallSubmit variant={variant}>{children}</SmallSubmit>
    </form>
  );
}
function SmallSubmit({ children, variant }: { children: ReactNode; variant: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={clsx(`btn-${variant}`, 'btn-sm')}>{pending ? '…' : children}</button>;
}
