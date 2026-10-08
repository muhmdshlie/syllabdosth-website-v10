import 'server-only';
/** Reads for the public site and the learner / faculty dashboards (FAQs, lessons, quizzes, tickets…). */
import { allRecords, createRecord, getRecord, updateRecord } from './admin/crud';
import { RESOURCES } from './admin/resources';
import type { Row } from './admin/types';
import type {
  AppNotification, Assignment, Certificate, FaqRow, LiveClass, Lesson, Offer, Profile, Quiz, Review, Submission, Testimonial, Ticket, TicketMessage,
} from './types';

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p; } catch { return fallback; } // tables from 0003 not created yet
}
const R = RESOURCES;

/* ------------------------------------------------------------------ public */
export async function listFaqs(): Promise<FaqRow[]> {
  const rows = await safe(allRecords(R.faqs, { filters: { published: 'true' } }), [] as Row[]);
  return rows as unknown as FaqRow[];
}
export async function listTestimonials(): Promise<Testimonial[]> {
  return (await safe(allRecords(R.testimonials, { filters: { published: 'true' } }), [] as Row[])) as unknown as Testimonial[];
}
export async function lessonsForCourse(courseId: string): Promise<Lesson[]> {
  return (await safe(allRecords(R.lessons, { filters: { course_id: courseId } }), [] as Row[])) as unknown as Lesson[];
}
export async function approvedReviews(courseId: string): Promise<Review[]> {
  return (await safe(allRecords(R.reviews, { filters: { course_id: courseId, approved: 'true' } }), [] as Row[])) as unknown as Review[];
}
export async function activeOffers(courseId?: string): Promise<Offer[]> {
  const rows = (await safe(allRecords(R.offers, { filters: { active: 'true' } }), [] as Row[])) as unknown as Offer[];
  const today = new Date().toISOString().slice(0, 10);
  return rows.filter((o) => (!o.valid_until || o.valid_until >= today) && (!o.course_id || o.course_id === courseId));
}
export async function certificateByCode(code: string): Promise<Certificate | null> {
  const clean = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!clean) return null;
  const rows = (await safe(allRecords(R.certificates, { filters: { code: clean } }), [] as Row[])) as unknown as Certificate[];
  return rows[0] ?? null;
}

/* ------------------------------------------------------------------ learner */
export async function enrolledCourseIds(userId: string): Promise<string[]> {
  const rows = await safe(allRecords(R.enrollments, { filters: { user_id: userId, status: 'converted' } }), [] as Row[]);
  return Array.from(new Set(rows.map((r) => String(r.course_id))));
}
export async function liveClassesFor(courseIds: string[] | 'all'): Promise<LiveClass[]> {
  const rows = (await safe(allRecords(R['live-classes'], { sort: 'starts_at', dir: 'asc' }), [] as Row[])) as unknown as LiveClass[];
  return rows.filter((c) => c.status !== 'cancelled' && (courseIds === 'all' || !c.course_id || courseIds.includes(c.course_id)));
}
export async function quizzesFor(courseIds: string[]): Promise<Quiz[]> {
  if (!courseIds.length) return [];
  const rows = (await safe(allRecords(R.quizzes, { filters: { published: 'true' } }), [] as Row[])) as unknown as Quiz[];
  return rows.filter((q) => courseIds.includes(q.course_id));
}
export async function assignmentsFor(courseIds: string[]): Promise<Assignment[]> {
  if (!courseIds.length) return [];
  const rows = (await safe(allRecords(R.assignments, { filters: { published: 'true' } }), [] as Row[])) as unknown as Assignment[];
  return rows.filter((a) => courseIds.includes(a.course_id));
}
export async function getQuiz(id: string): Promise<Quiz | null> {
  return (await safe(getRecord(R.quizzes, id), null)) as unknown as Quiz | null;
}
export async function getAssignment(id: string): Promise<Assignment | null> {
  return (await safe(getRecord(R.assignments, id), null)) as unknown as Assignment | null;
}
export async function submissionsForUser(userId: string): Promise<Submission[]> {
  return (await safe(allRecords(R.submissions, { filters: { user_id: userId } }), [] as Row[])) as unknown as Submission[];
}
export async function submissionsForCourses(courseIds: string[]): Promise<Submission[]> {
  if (!courseIds.length) return [];
  const rows = (await safe(allRecords(R.submissions), [] as Row[])) as unknown as Submission[];
  return rows.filter((s) => s.course_id && courseIds.includes(s.course_id));
}
export async function createSubmission(s: Omit<Submission, 'id' | 'created_at' | 'status' | 'feedback'> & { status?: Submission['status'] }) {
  return createRecord(R.submissions, { feedback: '', status: 'submitted', ...s });
}
export async function gradeSubmission(id: string, patch: { score: number | null; max_score?: number | null; feedback: string; status: Submission['status'] }) {
  return updateRecord(R.submissions, id, patch);
}
export async function getSubmission(id: string): Promise<Submission | null> {
  return (await safe(getRecord(R.submissions, id), null)) as unknown as Submission | null;
}
export async function certificatesForUser(userId: string): Promise<Certificate[]> {
  return (await safe(allRecords(R.certificates, { filters: { user_id: userId } }), [] as Row[])) as unknown as Certificate[];
}
export async function notificationsFor(p: Profile): Promise<AppNotification[]> {
  const rows = (await safe(allRecords(R.notifications), [] as Row[])) as unknown as AppNotification[];
  return rows.filter((n) => n.audience === 'all' || n.audience === p.role || (n.audience === 'user' && n.user_id === p.id)).slice(0, 30);
}
export async function reviewsByUser(userId: string): Promise<Review[]> {
  return (await safe(allRecords(R.reviews, { filters: { user_id: userId } }), [] as Row[])) as unknown as Review[];
}
export async function createReview(r: Omit<Review, 'id' | 'created_at' | 'approved'>) {
  return createRecord(R.reviews, { ...r, approved: false });
}

/* ------------------------------------------------------------------ support tickets */
export async function ticketsForUser(userId: string): Promise<Ticket[]> {
  return (await safe(allRecords(R.tickets, { filters: { user_id: userId } }), [] as Row[])) as unknown as Ticket[];
}
export async function getTicket(id: string): Promise<Ticket | null> {
  return (await safe(getRecord(R.tickets, id), null)) as unknown as Ticket | null;
}
export async function createTicket(t: { user_id: string; name: string; email: string | null; phone: string | null; subject: string; category: string; text: string }) {
  const now = new Date().toISOString();
  const messages: TicketMessage[] = [{ from: 'user', name: t.name, text: t.text, at: now }];
  return createRecord(R.tickets, { user_id: t.user_id, name: t.name, email: t.email, phone: t.phone, subject: t.subject, category: t.category, priority: 'normal', status: 'open', messages, updated_at: now });
}
export async function addTicketMessage(ticket: Ticket, msg: TicketMessage, status?: Ticket['status']) {
  return updateRecord(R.tickets, ticket.id, { messages: [...(ticket.messages ?? []), msg], updated_at: msg.at, ...(status ? { status } : {}) });
}
