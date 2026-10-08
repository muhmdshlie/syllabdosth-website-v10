'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { aiAction } from '@/app/admin-actions';
import type { ActionState } from '@/lib/action-state';
import { CopyButton } from './controls';
import { Icon } from './icons';

const TASKS: [string, string, string][] = [
  ['course', 'Course description', 'e.g. 30-day bridal blouse design course, online + offline, for beginners who can already stitch'],
  ['blog', 'Blog post', 'e.g. 5 mehandi trends for the 2026 wedding season'],
  ['social', 'Instagram & WhatsApp', 'e.g. New batch of Nail Art Certification starts 1 Nov, 10% festive offer'],
  ['email', 'Email reply', 'Paste the customer’s email and what you want to say'],
  ['faq', 'FAQs', 'e.g. saree draping course for beginners'],
  ['improve', 'Improve my text', 'Paste any text to correct and polish'],
  ['translate', 'Translate to Kannada & Hindi', 'Paste the text to translate'],
];

export function AiForm() {
  const [state, action] = useFormState(aiAction, {} as ActionState);
  const f = state.fields ?? {};
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form action={action} className="adm-card space-y-4 p-5">
        <div>
          <p className="adm-label">What do you need?</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {TASKS.map(([v, label], i) => (
              <label key={v} className="flex cursor-pointer items-center gap-2 rounded-xl border border-adm-line px-3 py-2.5 text-[14px] has-[:checked]:border-adm-green has-[:checked]:bg-adm-green-soft">
                <input type="radio" name="task" value={v} defaultChecked={(f.task ?? 'course') === v || (!f.task && i === 0)} className="accent-[#27AE7A]" />{label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="ai-input" className="adm-label">Details</label>
          <textarea id="ai-input" name="input" rows={7} defaultValue={f.input} className="adm-input" placeholder={TASKS[0][2]} />
        </div>
        <div>
          <label htmlFor="ai-tone" className="adm-label">Tone</label>
          <select id="ai-tone" name="tone" defaultValue={f.tone ?? 'warm and professional'} className="adm-input">
            {['warm and professional', 'friendly and simple', 'premium and elegant', 'exciting, for social media', 'formal'].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <Go />
        {state.error && <p role="alert" className="rounded-xl bg-adm-red-soft px-4 py-3 text-[14px] font-medium text-[#b3321a]">{state.error}</p>}
      </form>
      <section className="adm-card flex flex-col p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">Result</h2>
          {state.ok && state.message && <CopyButton text={state.message} />}
        </div>
        {state.ok && state.message ? (
          <div className="whitespace-pre-wrap rounded-xl bg-adm-bg p-4 text-[14px] leading-relaxed">{state.message}</div>
        ) : (
          <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-adm-line p-10 text-center text-[14px] text-adm-muted">Your draft appears here. Always read it before publishing.</p>
        )}
      </section>
    </div>
  );
}

function Go() {
  const { pending } = useFormStatus();
  return <button className="adm-btn-primary w-full" disabled={pending}><Icon name="sparkle" size={18} />{pending ? 'Writing…' : 'Write it'}</button>;
}
