import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { saveRecordAction } from '@/app/admin-actions';
import { Cell } from '@/components/admin/cells';
import { DeleteButton } from '@/components/admin/controls';
import { RecordEditor } from '@/components/admin/editor';
import { Icon } from '@/components/admin/icons';
import { TicketThread } from '@/components/admin/ticket-reply';
import { Card, Flash, fmtDateTime, fmtDay, PageHeader, StatusBadge } from '@/components/admin/ui';
import { getRecord, listRecords, relationKeys, relationOptions } from '@/lib/admin/crud';
import { imageFallbacks } from '@/lib/admin/fallbacks';
import { getResource, RESOURCES } from '@/lib/admin/resources';
import type { Option, Resource, Row } from '@/lib/admin/types';
import type { QuizQuestion, TicketMessage } from '@/lib/types';

type Params = { resource: string; id: string };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const r = getResource(params.resource);
  return { title: r ? `Edit ${r.singular}` : 'Admin' };
}

export default async function EditRecord({ params, searchParams }: { params: Params; searchParams: Record<string, string | undefined> }) {
  const r = getResource(params.resource);
  if (!r) notFound();
  const id = decodeURIComponent(params.id);
  const row = await getRecord(r, id);
  if (!row) notFound();
  const [options, fb] = await Promise.all([relationOptions(relationKeys(r)), imageFallbacks(r, [row])]);
  const imageField = r.fields.find((f) => f.type === 'image');
  const placeholders = imageField && fb[id] ? { [imageField.name]: fb[id] } : undefined;
  const name = String(row[r.titleField] ?? id);
  const view = r.viewPath?.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(String(row[k] ?? '')));

  return (
    <>
      <PageHeader
        title={name}
        crumbs={[{ href: `/admin/${r.key}`, label: r.label }, { label: r.noEdit ? 'Details' : 'Edit' }]}
        actions={<>
          {view && <a href={view} target="_blank" rel="noreferrer" className="adm-btn-outline"><Icon name="eye" size={18} />View on website</a>}
          {!r.noCreate && <Link href={`/admin/${r.key}/new`} className="adm-btn-outline"><Icon name="plus" size={18} />Add another</Link>}
          {!r.noDelete && <DeleteButton resource={r.key} id={id} name={name} back="edit" />}
        </>}
      />
      {searchParams.saved && <Flash>Saved. You can keep editing below.</Flash>}
      {searchParams.error && <Flash tone="red">{searchParams.error}</Flash>}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {r.key === 'tickets' && (
            <Card title={`Conversation · ${String(row.category)}`} action={<StatusBadge value={String(row.status)} />}>
              <TicketThread id={id} status={String(row.status)} messages={(row.messages as TicketMessage[]) ?? []} />
            </Card>
          )}
          {r.key === 'submissions' && row.kind === 'quiz' && <QuizAnswers row={row} />}
          {r.noEdit ? (
            <Card title="Details">
              <dl className="grid gap-4 sm:grid-cols-2">
                {r.columns.map((c) => (
                  <div key={c.name}><dt className="text-[12px] font-semibold uppercase tracking-wide text-adm-muted">{c.label || c.name}</dt><dd className="mt-1 text-[14px]">{Cell({ col: c, row, r: { ...r, noEdit: true }, options })}</dd></div>
                ))}
              </dl>
            </Card>
          ) : (
            <Card title={r.key === 'tickets' ? 'Ticket details' : `Edit ${r.singular}`}>
              <RecordEditor fields={r.fields} initial={row} action={saveRecordAction} hidden={{ resource: r.key, id }} options={options} folder={r.key} placeholders={placeholders} />
            </Card>
          )}
        </div>
        <aside className="space-y-6">
          <Card title="Info">
            <dl className="space-y-3 text-[14px]">
              <div className="flex justify-between gap-4"><dt className="text-adm-muted">ID</dt><dd className="truncate font-mono text-[12px]">{id}</dd></div>
              {'created_at' in row && <div className="flex justify-between gap-4"><dt className="text-adm-muted">Added</dt><dd>{fmtDateTime(row.created_at)}</dd></div>}
              {'updated_at' in row && <div className="flex justify-between gap-4"><dt className="text-adm-muted">Updated</dt><dd>{fmtDateTime(row.updated_at)}</dd></div>}
            </dl>
          </Card>
          <Related r={r} row={row} options={options} />
        </aside>
      </div>
    </>
  );
}

async function QuizAnswers({ row }: { row: Row }) {
  const quiz = row.quiz_id ? await getRecord(RESOURCES.quizzes, String(row.quiz_id)) : null;
  const qs = (quiz?.questions as QuizQuestion[]) ?? [];
  const answers = (row.answers as number[]) ?? [];
  return (
    <Card title={`Quiz answers · ${String(row.score ?? 0)}/${String(row.max_score ?? qs.length)}`}>
      <ol className="space-y-3">
        {qs.map((q, i) => {
          const ok = answers[i] === q.correct;
          return (
            <li key={i} className="rounded-xl border border-adm-line p-3 text-[14px]">
              <p className="font-medium">{i + 1}. {q.question}</p>
              <p className={`mt-1 ${ok ? 'text-[#16784f]' : 'text-[#b3321a]'}`}>{ok ? '✓' : '✗'} Answered: {q.options[(answers[i] ?? 0) - 1] ?? 'no answer'}{!ok && <span className="text-adm-muted"> · Correct: {q.options[q.correct - 1]}</span>}</p>
            </li>
          );
        })}
        {!qs.length && <li className="text-adm-muted">This quiz was deleted.</li>}
      </ol>
    </Card>
  );
}

/** Links and small lists that help while editing (lessons of a course, a student's enrolments…). */
async function Related({ r, row, options }: { r: Resource; row: Row; options: Record<string, Option[]> }) {
  const id = String(row[r.pk]);
  const links = (items: [string, string][]) => (
    <ul className="space-y-1">{items.map(([href, label]) => <li key={href}><Link href={href} className="flex items-center justify-between rounded-lg px-2 py-2 text-[14px] hover:bg-adm-bg hover:text-adm-green">{label}<Icon name="chevronRight" size={16} /></Link></li>)}</ul>
  );
  if (r.key === 'courses') {
    return (
      <Card title="This course">
        {links([
          [`/admin/lessons?course_id=${id}`, 'Lessons'], [`/admin/lessons/new?course_id=${id}`, '+ Add a lesson'],
          [`/admin/quizzes?course_id=${id}`, 'Quizzes'], [`/admin/assignments?course_id=${id}`, 'Assignments'],
          [`/admin/live-classes?course_id=${id}`, 'Live classes'], [`/admin/enrollments?course_id=${id}`, 'Enrollments'],
          [`/admin/reviews?course_id=${id}`, 'Reviews'], [`/admin/certificates?course_id=${id}`, 'Certificates'],
        ])}
      </Card>
    );
  }
  if (r.key === 'students' || r.key === 'users') {
    const [enr, subs, certs] = await Promise.all([
      listRecords(RESOURCES.enrollments, { filters: { user_id: id }, perPage: 50 }),
      listRecords(RESOURCES.submissions, { filters: { user_id: id }, perPage: 50 }),
      listRecords(RESOURCES.certificates, { filters: { user_id: id }, perPage: 50 }),
    ]);
    const courses = options.courses ?? (await relationOptions(['courses'])).courses;
    const cname = (cid: unknown) => courses?.find((o) => o.value === String(cid))?.label ?? String(cid);
    return (
      <>
        <Card title={`Enrolments (${enr.total})`}>
          {enr.rows.length ? <ul className="space-y-2">{enr.rows.map((e) => <li key={String(e.id)} className="flex items-center justify-between gap-2 text-[14px]"><Link className="hover:text-adm-green" href={`/admin/enrollments/${e.id}`}>{cname(e.course_id)}</Link><StatusBadge value={String(e.status)} /></li>)}</ul> : <p className="text-[14px] text-adm-muted">No enrolments.</p>}
        </Card>
        <Card title={`Certificates (${certs.total})`} action={<Link href={`/admin/certificates/new?user_id=${id}&student_name=${encodeURIComponent(String(row.full_name ?? ''))}`} className="adm-btn-outline adm-btn-sm">Issue</Link>}>
          {certs.rows.length ? <ul className="space-y-2">{certs.rows.map((c) => <li key={String(c.id)} className="text-[14px]"><Link className="hover:text-adm-green" href={`/admin/certificates/${c.id}`}>{cname(c.course_id)}</Link> <span className="text-adm-muted">· {fmtDay(c.issued_on)}</span></li>)}</ul> : <p className="text-[14px] text-adm-muted">None yet.</p>}
        </Card>
        <Card title={`Submissions (${subs.total})`}>
          {subs.rows.length ? <ul className="space-y-2">{subs.rows.map((s) => <li key={String(s.id)} className="flex items-center justify-between gap-2 text-[14px]"><Link className="hover:text-adm-green" href={`/admin/submissions/${s.id}`}>{`${String(s.kind)} · ${String(s.score ?? '–')}/${String(s.max_score ?? '–')}`}</Link><StatusBadge value={String(s.status)} /></li>)}</ul> : <p className="text-[14px] text-adm-muted">None yet.</p>}
        </Card>
      </>
    );
  }
  if (r.key === 'instructors') return <Card title="This instructor">{links([[`/admin/courses`, 'Courses (set Instructor on a course)'], [`/admin/live-classes/new?faculty_id=${id}`, '+ Schedule a live class']])}</Card>;
  if (r.key === 'enrollments' && row.status === 'converted') {
    return <Card title="Next steps">{links([[`/admin/certificates/new?course_id=${row.course_id}&student_name=${encodeURIComponent(String(row.name))}${row.user_id ? `&user_id=${row.user_id}` : ''}`, 'Issue certificate']])}</Card>;
  }
  return null;
}
