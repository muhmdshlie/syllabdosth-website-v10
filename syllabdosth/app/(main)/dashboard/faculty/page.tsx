import type { Metadata } from 'next';
import Link from 'next/link';
import { facultyGradeAction, facultySetEnrollmentStatus } from '@/app/dashboard-actions';
import { DashboardShell, Panel, StatGrid, Table } from '@/components/dashboard';
import { ActionForm, Field, InlineAction, SelectField, SubmitButton } from '@/components/forms';
import { StatusPill } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { coursesForFaculty, getFacultyForUser, listEnrollments } from '@/lib/data';
import { durationLabel, fmtDate, inr } from '@/lib/format';
import { liveClassesFor, submissionsForCourses } from '@/lib/lms';

export const metadata: Metadata = { title: 'Faculty dashboard' };

export default async function FacultyDashboard() {
  const user = await requireRole(['faculty'], '/dashboard/faculty');
  const fac = await getFacultyForUser(user.id);
  if (!fac) {
    return (
      <DashboardShell user={user} title="Faculty dashboard">
        <Panel title="Your faculty profile is being set up">
          <p className="text-ink-soft">You’re approved as faculty. Our team will link your courses shortly.</p>
        </Panel>
      </DashboardShell>
    );
  }
  const courses = await coursesForFaculty(fac.id);
  const ids = courses.map((c) => c.id);
  const [enquiries, classes, subs] = await Promise.all([listEnrollments({ courseIds: ids }), liveClassesFor(ids), submissionsForCourses(ids)]);
  const mineClasses = classes.filter((c) => (c.course_id && ids.includes(c.course_id)) || c.faculty_id === fac.id);
  const toGrade = subs.filter((x) => x.kind === 'assignment' && x.status === 'submitted');
  const title = (id: string) => courses.find((c) => c.id === id)?.title ?? 'Course';

  return (
    <DashboardShell user={user} title={fac.name}>
      <StatGrid items={[['My courses', courses.length], ['New enquiries', enquiries.filter((e) => e.status === 'new').length], ['Students trained', `${fac.students.toLocaleString('en-IN')}+`], ['Experience', `${fac.years} yrs`]]} />
      <Panel title="Enrollment enquiries for my courses">
        <Table
          head={['Learner', 'Course', 'Mode', 'Received', 'Status', '']}
          empty="No enquiries yet."
          rows={enquiries.map((e) => [
            <div key="l"><p className="font-semibold">{e.name}</p><p className="text-[13px]">{e.phone}</p></div>,
            title(e.course_id), e.mode, fmtDate(e.created_at),
            <StatusPill key="s" status={e.status} />,
            <div key="a" className="flex flex-wrap gap-2">
              {e.status === 'new' && <InlineAction action={facultySetEnrollmentStatus} fields={{ id: e.id, status: 'contacted' }} variant="primary">Mark contacted</InlineAction>}
              {e.status === 'contacted' && <InlineAction action={facultySetEnrollmentStatus} fields={{ id: e.id, status: 'converted' }} variant="dark">Mark enrolled</InlineAction>}
            </div>,
          ])}
        />
      </Panel>
      <Panel title={`Assignments to grade (${toGrade.length})`}>
        {toGrade.length ? (
          <div className="space-y-5">
            {toGrade.map((x) => (
              <div key={x.id} className="rounded-card border border-line bg-white/60 p-5">
                <p className="font-semibold">{x.student_name} <span className="font-normal text-ink-soft">· {title(x.course_id ?? '')} · {fmtDate(x.created_at)}</span></p>
                <p className="mt-2 whitespace-pre-wrap break-words text-[14px]">{x.answer}</p>
                <ActionForm action={facultyGradeAction} className="mt-4 grid gap-3 sm:grid-cols-[120px_1fr_180px_auto] sm:items-end">
                  <input type="hidden" name="id" value={x.id} />
                  <Field label={`Score / ${x.max_score ?? 100}`} name="score" type="number" required min={0} />
                  <Field label="Feedback" name="feedback" />
                  <SelectField label="Result" name="status" options={[{ value: 'graded', label: 'Graded' }, { value: 'returned', label: 'Needs changes' }]} />
                  <SubmitButton pendingText="Saving…">Save</SubmitButton>
                </ActionForm>
              </div>
            ))}
          </div>
        ) : <p className="text-ink-soft">Nothing to grade right now.</p>}
      </Panel>
      <Panel title="My live classes">
        <Table
          head={['Class', 'When', 'Link']}
          empty="No live classes scheduled. Ask the admin team to schedule one."
          rows={mineClasses.map((c) => [
            <span key="t" className="font-semibold">{c.title}</span>,
            new Date(c.starts_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }),
            c.meeting_url ? <a key="l" href={c.meeting_url} target="_blank" rel="noreferrer" className="font-semibold underline">Start / join</a> : '—',
          ])}
        />
      </Panel>
      <Panel title="My courses">
        <Table
          head={['Course', 'Duration', 'Fee', 'Students', '']}
          empty="No courses linked yet."
          rows={courses.map((c) => [
            <span key="t" className="font-semibold">{c.title}</span>, durationLabel(c.duration_days), inr(c.price), c.students.toLocaleString('en-IN'),
            <Link key="v" href={`/courses/${c.slug}`} className="font-semibold underline">View page</Link>,
          ])}
        />
      </Panel>
    </DashboardShell>
  );
}
