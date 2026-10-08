import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createTicketAction, submitAssignmentAction, submitReviewAction, updateProfileAction } from '@/app/dashboard-actions';
import { DashboardShell, Panel, StatGrid, Table } from '@/components/dashboard';
import { ActionForm, Field, SelectField, SubmitButton, TextArea } from '@/components/forms';
import { StatusPill } from '@/components/ui';
import { dashboardPathFor, requireUser } from '@/lib/auth';
import { listBookings, listCourses, listEnrollments, listServices } from '@/lib/data';
import { bookingStatusLabel, fmtDate, fmtTime } from '@/lib/format';
import * as lms from '@/lib/lms';

export const metadata: Metadata = { title: 'My dashboard' };

const TABS = [['overview', 'Overview'], ['learning', 'My learning'], ['certificates', 'Certificates'], ['notifications', 'Notifications'], ['support', 'Support']] as const;
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

export default async function LearnerDashboard({ searchParams }: { searchParams: { tab?: string } }) {
  const user = await requireUser('/dashboard');
  if (user.profile.role !== 'learner') redirect(dashboardPathFor(user.profile.role));
  const tab = TABS.some(([k]) => k === searchParams.tab) ? searchParams.tab! : 'overview';
  const [bookings, enrollments, services, courses, enrolledIds, certs, notes] = await Promise.all([
    listBookings({ customerId: user.id }), listEnrollments({ userId: user.id }), listServices(), listCourses(),
    lms.enrolledCourseIds(user.id), lms.certificatesForUser(user.id), lms.notificationsFor(user.profile),
  ]);
  const svc = (id: string) => services.find((s) => s.id === id)?.title ?? 'Service';
  const course = (id: string | null) => courses.find((c) => c.id === id);
  const upcoming = bookings.filter((b) => b.status === 'pending' || b.status === 'confirmed');

  return (
    <DashboardShell user={user} title={`Hi ${user.profile.full_name.split(' ')[0] || 'there'}`} tabs={TABS.map(([k, l]) => ({ href: `/dashboard?tab=${k}`, label: l, active: k === tab }))}>
      {tab === 'overview' && (
        <>
          <StatGrid items={[['Upcoming bookings', upcoming.length], ['Enrolled courses', enrolledIds.length], ['Course enquiries', enrollments.length], ['Certificates', certs.length]]} />
          {notes[0] && (
            <Panel title="Latest update" action={<Link href="/dashboard?tab=notifications" className="btn-secondary btn-sm">All updates</Link>}>
              <p className="font-semibold">{notes[0].title}</p>
              <p className="mt-1 whitespace-pre-line text-ink-soft">{notes[0].body}</p>
              {notes[0].link && <Link href={notes[0].link} className="mt-3 inline-block font-semibold underline">Open</Link>}
            </Panel>
          )}
          <Panel title="My bookings" action={<Link href="/services" className="btn-primary btn-sm">Book a service</Link>}>
            <Table
              head={['Service', 'Date', 'Status', '']}
              empty="No bookings yet. Book a verified professional in a few taps."
              rows={bookings.map((b) => [
                <span key="s" className="font-semibold">{svc(b.service_id)}</span>,
                `${fmtDate(b.preferred_date)}, ${fmtTime(b.preferred_time)}`,
                <StatusPill key="st" status={b.status} label={bookingStatusLabel[b.status]} />,
                <Link key="l" href={`/bookings/${b.id}`} className="font-semibold underline">View</Link>,
              ])}
            />
          </Panel>
          <Panel title="My courses" action={<Link href="/courses" className="btn-secondary btn-sm">Browse courses</Link>}>
            <Table
              head={['Course', 'Requested', 'Status']}
              empty="You haven’t enrolled in a course yet."
              rows={enrollments.map((e) => {
                const c = course(e.course_id);
                return [
                  c ? <Link key="c" href={`/courses/${c.slug}`} className="font-semibold underline">{c.title}</Link> : 'Course',
                  fmtDate(e.created_at),
                  <StatusPill key="s" status={e.status} label={e.status === 'new' ? 'Request received' : e.status === 'contacted' ? 'Team in touch' : e.status === 'converted' ? 'Enrolled' : 'Closed'} />,
                ];
              })}
            />
          </Panel>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="My profile">
              <ActionForm action={updateProfileAction} className="space-y-5">
                <Field label="Full name" name="full_name" required defaultValue={user.profile.full_name} autoComplete="name" />
                <Field label="Mobile number" name="phone" type="tel" defaultValue={user.profile.phone ?? ''} autoComplete="tel" />
                <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
              </ActionForm>
            </Panel>
            <Panel title="Grow with Syllabdosth">
              <p className="text-ink-soft">Finished a course? Start taking bookings, or teach what you know.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/apply/professional" className="btn-primary">Register as a pro</Link>
                <Link href="/apply/faculty" className="btn-secondary">Apply as faculty</Link>
              </div>
            </Panel>
          </div>
        </>
      )}

      {tab === 'learning' && <Learning userId={user.id} enrolledIds={enrolledIds} courseTitle={(id) => course(id)?.title ?? 'Course'} courseSlug={(id) => course(id)?.slug ?? ''} />}

      {tab === 'certificates' && (
        <Panel title="My certificates">
          <Table
            head={['Course', 'Issued', 'Certificate no.', '']}
            empty="Certificates appear here when you complete a course."
            rows={certs.map((c) => [
              <span key="t" className="font-semibold">{course(c.course_id)?.title ?? 'Course'}</span>, fmtDate(c.issued_on),
              <span key="n" className="font-mono">{c.code}</span>,
              <Link key="v" href={`/certificates/${c.code}`} className="font-semibold underline">Verification page</Link>,
            ])}
          />
        </Panel>
      )}

      {tab === 'notifications' && (
        <Panel title="Notifications">
          {notes.length ? (
            <ul className="divide-y divide-line">
              {notes.map((n) => (
                <li key={n.id} className="py-4">
                  <p className="text-[12px] text-ink-soft">{fmtDate(n.created_at)}</p>
                  <p className="mt-1 font-semibold">{n.title}</p>
                  <p className="mt-1 whitespace-pre-line text-ink-soft">{n.body}</p>
                  {n.link && <Link href={n.link} className="mt-2 inline-block text-[14px] font-semibold underline">Open</Link>}
                </li>
              ))}
            </ul>
          ) : <p className="text-ink-soft">No notifications yet.</p>}
        </Panel>
      )}

      {tab === 'support' && <Support userId={user.id} />}
    </DashboardShell>
  );
}

async function Learning({ userId, enrolledIds, courseTitle, courseSlug }: { userId: string; enrolledIds: string[]; courseTitle: (id: string) => string; courseSlug: (id: string) => string }) {
  if (!enrolledIds.length) {
    return (
      <Panel title="My learning">
        <p className="text-ink-soft">Once our team confirms your enrolment, your live classes, lessons, quizzes and assignments appear here.</p>
        <Link href="/courses" className="btn-primary mt-5">Browse courses</Link>
      </Panel>
    );
  }
  const [classes, quizzes, assignments, subs, reviews, lessons] = await Promise.all([
    lms.liveClassesFor(enrolledIds), lms.quizzesFor(enrolledIds), lms.assignmentsFor(enrolledIds), lms.submissionsForUser(userId), lms.reviewsByUser(userId),
    Promise.all(enrolledIds.map((id) => lms.lessonsForCourse(id))),
  ]);
  const now = new Date(Date.now() - 3 * 3600_000).toISOString();
  const upcoming = classes.filter((c) => c.starts_at >= now && c.status !== 'completed');
  const past = classes.filter((c) => c.recording_url && (c.starts_at < now || c.status === 'completed'));
  const best = (quizId: string) => subs.filter((s) => s.quiz_id === quizId).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  return (
    <>
      <Panel title="Live classes">
        <Table
          head={['Class', 'Course', 'When', '']}
          empty="No live classes scheduled right now."
          rows={upcoming.map((c) => [
            <span key="t" className="font-semibold">{c.title}</span>, c.course_id ? courseTitle(c.course_id) : 'All learners', `${when(c.starts_at)} · ${c.duration_mins} min · ${c.platform}`,
            c.meeting_url ? <a key="j" href={c.meeting_url} target="_blank" rel="noreferrer" className="btn-primary btn-sm">Join</a> : <span key="j" className="text-[13px] text-ink-soft">Link soon</span>,
          ])}
        />
        {past.length > 0 && (
          <div className="mt-6">
            <p className="font-semibold">Recordings</p>
            <ul className="mt-2 space-y-1 text-[14px]">{past.map((c) => <li key={c.id}><a href={c.recording_url!} target="_blank" rel="noreferrer" className="underline">{c.title}</a> <span className="text-ink-soft">· {fmtDate(c.starts_at)}</span></li>)}</ul>
          </div>
        )}
      </Panel>

      {enrolledIds.map((id, i) => lessons[i].length > 0 && (
        <Panel key={id} title={`Lessons · ${courseTitle(id)}`}>
          <ol className="divide-y divide-line">
            {lessons[i].map((l, n) => (
              <li key={l.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-semibold">{n + 1}. {l.title}</p>{l.content && <p className="whitespace-pre-line text-[14px] text-ink-soft">{l.content}</p>}</div>
                {l.video_url && <a href={l.video_url} target="_blank" rel="noreferrer" className="btn-secondary btn-sm shrink-0">{l.kind === 'download' ? 'Download' : 'Open'}</a>}
              </li>
            ))}
          </ol>
        </Panel>
      ))}

      <Panel title="Quizzes">
        <Table
          head={['Quiz', 'Course', 'Best score', '']}
          empty="No quizzes yet."
          rows={quizzes.map((q) => {
            const b = best(q.id);
            return [
              <span key="t" className="font-semibold">{q.title}</span>, courseTitle(q.course_id),
              b ? `${b.score}/${b.max_score}` : '—',
              <Link key="go" href={`/dashboard/quiz/${q.id}`} className="btn-primary btn-sm">{b ? 'Try again' : 'Start quiz'}</Link>,
            ];
          })}
        />
      </Panel>

      <Panel title="Assignments">
        {assignments.length ? (
          <div className="space-y-6">
            {assignments.map((a) => {
              const mine = subs.filter((s) => s.assignment_id === a.id);
              const last = mine[0];
              return (
                <div key={a.id} className="rounded-card border border-line bg-white/60 p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{a.title}</p>
                    <p className="text-[13px] text-ink-soft">{courseTitle(a.course_id)}{a.due_date ? ` · due ${fmtDate(a.due_date)}` : ''} · {a.max_marks} marks</p>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-[14px] text-ink-soft">{a.instructions}</p>
                  {last && (
                    <div className="mt-4 rounded-[4px] bg-muted px-4 py-3 text-[14px]">
                      <p><span className="font-semibold">Your submission:</span> {last.status === 'graded' ? `graded ${last.score}/${last.max_score}` : last.status === 'returned' ? 'returned for changes' : 'waiting to be graded'}</p>
                      {last.feedback && <p className="mt-1 text-ink-soft">Feedback: {last.feedback}</p>}
                    </div>
                  )}
                  {(!last || last.status === 'returned') && (
                    <ActionForm action={submitAssignmentAction} className="mt-4 space-y-3">
                      <input type="hidden" name="assignment_id" value={a.id} />
                      <TextArea label="Your answer or a link to your work" name={`answer`} required rows={3} placeholder="Paste a Google Drive / photos link, or write your answer" />
                      <SubmitButton pendingText="Submitting…">Submit</SubmitButton>
                    </ActionForm>
                  )}
                </div>
              );
            })}
          </div>
        ) : <p className="text-ink-soft">No assignments yet.</p>}
      </Panel>

      <Panel title="Rate your course">
        <div className="space-y-6">
          {enrolledIds.map((id) => reviews.some((r) => r.course_id === id) ? (
            <p key={id} className="text-[14px] text-ink-soft">✓ You reviewed <span className="font-semibold text-ink">{courseTitle(id)}</span>. Thank you!</p>
          ) : (
            <ActionForm key={id} action={submitReviewAction} className="grid gap-4 sm:grid-cols-[180px_1fr_auto] sm:items-end">
              <input type="hidden" name="course_id" value={id} />
              <SelectField label={courseTitle(id)} name="rating" defaultValue="5" options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${'★'.repeat(n)} (${n})` }))} />
              <Field label="Your review" name="comment" required placeholder="What did you like? What could be better?" />
              <SubmitButton pendingText="Sending…">Post review</SubmitButton>
            </ActionForm>
          ))}
          <p className="text-[13px] text-ink-soft">Reviews show on <Link className="underline" href={`/courses/${courseSlug(enrolledIds[0])}`}>the course page</Link> after a quick check.</p>
        </div>
      </Panel>
    </>
  );
}

async function Support({ userId }: { userId: string }) {
  const tickets = await lms.ticketsForUser(userId);
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Panel title="My support tickets">
        <Table
          head={['Subject', 'Status', 'Updated', '']}
          empty="No tickets yet."
          rows={tickets.map((t) => [
            <span key="s" className="font-semibold">{t.subject}</span>,
            <span key="st" className="capitalize">{t.status.replace('_', ' ')}</span>,
            fmtDate(t.updated_at),
            <Link key="o" href={`/dashboard/support/${t.id}`} className="font-semibold underline">Open</Link>,
          ])}
        />
      </Panel>
      <Panel title="Ask for help">
        <ActionForm action={createTicketAction} className="space-y-4">
          <Field label="Subject" name="subject" required placeholder="e.g. Certificate name correction" />
          <SelectField label="Topic" name="category" options={['General', 'Courses', 'Bookings', 'Certificates', 'Account', 'Technical'].map((c) => ({ value: c, label: c }))} />
          <TextArea label="Message" name="text" required rows={5} />
          <SubmitButton pendingText="Sending…">Send to support</SubmitButton>
        </ActionForm>
      </Panel>
    </div>
  );
}
