import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { userTicketReplyAction } from '@/app/dashboard-actions';
import { DashboardShell, Panel } from '@/components/dashboard';
import { ActionForm, SubmitButton, TextArea } from '@/components/forms';
import { requireUser } from '@/lib/auth';
import { getTicket } from '@/lib/lms';

export const metadata: Metadata = { title: 'Support ticket' };

export default async function TicketPage({ params }: { params: { id: string } }) {
  const user = await requireUser(`/dashboard/support/${params.id}`);
  const t = await getTicket(params.id);
  if (!t || t.user_id !== user.id) notFound();
  const back = user.profile.role === 'learner' ? '/dashboard?tab=support' : '/dashboard';
  return (
    <DashboardShell user={user} title={t.subject}>
      <Link href={back} className="text-[14px] font-semibold underline">← Back</Link>
      <Panel title={`Ticket · ${t.category} · ${t.status.replace('_', ' ')}`}>
        <ol className="space-y-3">
          {t.messages.map((m, i) => (
            <li key={i} className={`max-w-[85%] rounded-card px-4 py-3 ${m.from === 'user' ? 'ml-auto bg-noir text-pearl' : 'bg-muted'}`}>
              <p className="text-[12px] opacity-70">{m.from === 'user' ? 'You' : m.name} · {new Date(m.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}</p>
              <p className="mt-1 whitespace-pre-wrap text-[15px]">{m.text}</p>
            </li>
          ))}
        </ol>
        <ActionForm action={userTicketReplyAction} className="mt-6 space-y-3 border-t border-line pt-6">
          <input type="hidden" name="id" value={t.id} />
          <TextArea label="Reply" name="text" required rows={3} />
          <SubmitButton pendingText="Sending…">Send</SubmitButton>
        </ActionForm>
      </Panel>
    </DashboardShell>
  );
}
