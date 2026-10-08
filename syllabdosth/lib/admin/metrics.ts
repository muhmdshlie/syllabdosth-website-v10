import 'server-only';
import { countRecords, listRecords, rowsSince } from './crud';
import { RESOURCES } from './resources';
import type { Row } from './types';

const DAY = 86400_000;
/** Midnight IST today, as a Date. */
function istMidnight(daysAgo = 0) {
  const now = new Date(Date.now() + 330 * 60_000);
  now.setUTCHours(0, 0, 0, 0);
  return new Date(now.getTime() - 330 * 60_000 - daysAgo * DAY);
}
const dayIndex = (iso: string, start: Date) => Math.floor((new Date(iso).getTime() - start.getTime()) / DAY);

function perDay(rows: Row[], start: Date, days: number, keep: (r: Row) => boolean = () => true) {
  const out = Array(days).fill(0) as number[];
  for (const r of rows) {
    if (!keep(r) || !r.created_at) continue;
    const i = dayIndex(String(r.created_at), start);
    if (i >= 0 && i < days) out[i]++;
  }
  return out;
}

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p; } catch { return fallback; }
}

export async function dashboardMetrics(rangeDays: 7 | 30) {
  const days = Math.max(rangeDays, 14);
  const start = istMidnight(days - 1);
  const monthAgo = new Date(Date.now() - 30 * DAY).toISOString();
  const s = start.toISOString();

  const [profiles, enrollments, bookings, courses, orgs, faculty] = await Promise.all([
    safe(rowsSince('profiles', s, 'created_at,role'), []),
    safe(rowsSince('enrollments', s, 'created_at,course_id,status'), []),
    safe(rowsSince('bookings', s, 'created_at'), []),
    safe(rowsSince('courses', s, 'created_at'), []),
    safe(rowsSince('organisations', s, 'created_at'), []),
    safe(rowsSince('faculty', s, 'created_at'), []),
  ]);
  const learner = (r: Row) => r.role === 'learner';
  const series = {
    students: perDay(profiles, start, days, learner),
    enquiries: perDay(enrollments, start, days),
    bookings: perDay(bookings, start, days),
    courses: perDay(courses, start, days),
    orgs: perDay(orgs, start, days),
    faculty: perDay(faculty, start, days),
  };
  const lastN = (a: number[]) => a.slice(-rangeDays);

  const [totEnroll, totBookings, totOrgs, totCourses, totFaculty, totStudents, mEnroll, mBookings, mOrgs, mCourses, enrolled] = await Promise.all([
    safe(countRecords('enrollments'), 0), safe(countRecords('bookings'), 0), safe(countRecords('organisations'), 0), safe(countRecords('courses'), 0),
    safe(countRecords('faculty'), 0), safe(countRecords('profiles', { role: 'learner' }), 0),
    safe(countRecords('enrollments', {}, monthAgo), 0), safe(countRecords('bookings', {}, monthAgo), 0), safe(countRecords('organisations', {}, monthAgo), 0), safe(countRecords('courses', {}, monthAgo), 0),
    safe(countRecords('enrollments', { status: 'converted' }), 0),
  ]);

  // Most-enquired courses in the range
  const rangeStart = istMidnight(rangeDays - 1).toISOString();
  const byCourse = new Map<string, { total: number; enrolled: number }>();
  for (const e of enrollments) {
    if (String(e.created_at) < rangeStart) continue;
    const k = String(e.course_id);
    const v = byCourse.get(k) ?? { total: 0, enrolled: 0 };
    v.total++;
    if (e.status === 'converted') v.enrolled++;
    byCourse.set(k, v);
  }
  const topCourses = Array.from(byCourse.entries()).sort((a, b) => b[1].total - a[1].total).slice(0, 6).map(([course_id, v]) => ({ course_id, ...v }));

  const [recent, upcoming, tickets] = await Promise.all([
    safe(listRecords(RESOURCES.enrollments, { perPage: 6 }), { rows: [], total: 0 }),
    safe(listRecords(RESOURCES['live-classes'], { filters: { status: 'scheduled' }, perPage: 50, sort: 'starts_at', dir: 'asc' }), { rows: [], total: 0 }),
    safe(listRecords(RESOURCES.tickets, { filters: { status: 'open' }, perPage: 5 }), { rows: [], total: 0 }),
  ]);
  const now = new Date().toISOString();

  const labels = Array.from({ length: rangeDays }, (_, i) => {
    const d = new Date(istMidnight(rangeDays - 1 - i).getTime() + 330 * 60_000);
    return rangeDays <= 7 ? d.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'UTC' }) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  });

  return {
    cards: {
      enrollments: { total: totEnroll, month: mEnroll, spark: series.enquiries.slice(-14) },
      bookings: { total: totBookings, month: mBookings, spark: series.bookings.slice(-14) },
      orgs: { total: totOrgs, month: mOrgs, spark: series.orgs.slice(-14) },
      courses: { total: totCourses, month: mCourses, spark: series.courses.slice(-14) },
      faculty: { total: totFaculty, spark: series.faculty.slice(-14) },
      students: { total: totStudents, spark: series.students.slice(-14) },
      enrolled,
    },
    report: {
      labels,
      students: lastN(series.students), enquiries: lastN(series.enquiries), bookings: lastN(series.bookings), courses: lastN(series.courses),
    },
    topCourses,
    recent: recent.rows,
    upcoming: upcoming.rows.filter((r) => String(r.starts_at) >= now).slice(0, 5),
    tickets: tickets.rows,
  };
}
