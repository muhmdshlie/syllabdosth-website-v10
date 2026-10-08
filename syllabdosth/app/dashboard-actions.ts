'use server';
/** Signed-in actions. Every action re-checks the caller's role and ownership. */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { ActionState } from '@/lib/action-state';
import { getCurrentUser, requireRole } from '@/lib/auth';
import * as data from '@/lib/data';
import * as lms from '@/lib/lms';
import { notifyEnquiry } from '@/lib/mailer';
import type { ApplicationStatus, BookingStatus, EnquiryStatus, Role } from '@/lib/types';

const s = (fd: FormData, k: string) => String(fd.get(k) ?? '');

/* Professional: respond to booking requests for their own listing */
export async function proSetBookingStatus(fd: FormData) {
  const user = await requireRole(['professional', 'admin'], '/dashboard/pro');
  const status = s(fd, 'status') as BookingStatus;
  if (!['confirmed', 'declined', 'completed'].includes(status)) return;
  const booking = await data.getBooking(s(fd, 'id'));
  if (!booking) return;
  if (user.profile.role !== 'admin') {
    const pro = await data.getProfessionalForUser(user.id);
    if (!pro || pro.id !== booking.professional_id) return;
  }
  await data.setBookingStatus(booking.id, status);
  revalidatePath('/dashboard/pro');
  revalidatePath(`/bookings/${booking.id}`);
}

/* Faculty: mark enrollment enquiries for their own courses */
export async function facultySetEnrollmentStatus(fd: FormData) {
  const user = await requireRole(['faculty', 'admin'], '/dashboard/faculty');
  const status = s(fd, 'status') as EnquiryStatus;
  if (!['contacted', 'converted', 'closed'].includes(status)) return;
  if (user.profile.role !== 'admin') {
    const fac = await data.getFacultyForUser(user.id);
    if (!fac) return;
    const mine = (await data.coursesForFaculty(fac.id)).map((c) => c.id);
    const enquiry = (await data.listEnrollments({ courseIds: mine })).find((e) => e.id === s(fd, 'id'));
    if (!enquiry) return;
  }
  await data.setEnrollmentStatus(s(fd, 'id'), status);
  revalidatePath('/dashboard/faculty');
}

/* Profile */
export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Please log in again.' };
  const p = z.object({
    full_name: z.string().trim().min(2, 'Enter your name').max(80),
    phone: z.string().trim().regex(/^(\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/, 'Enter a valid Indian mobile number').or(z.literal('')),
  }).safeParse({ full_name: fd.get('full_name'), phone: fd.get('phone') });
  if (!p.success) return { error: p.error.issues[0].message };
  await data.updateProfile(user.id, p.data);
  revalidatePath('/dashboard');
  return { ok: true, message: 'Profile saved.' };
}

/* Admin */
export async function adminSetBookingStatus(fd: FormData) {
  await requireRole(['admin'], '/admin');
  const status = s(fd, 'status') as BookingStatus;
  if (!['pending', 'confirmed', 'declined', 'cancelled', 'completed'].includes(status)) return;
  await data.setBookingStatus(s(fd, 'id'), status);
  revalidatePath('/admin');
}
export async function adminSetGroupStatus(fd: FormData) {
  await requireRole(['admin'], '/admin');
  const status = s(fd, 'status') as EnquiryStatus;
  if (!['new', 'contacted', 'converted', 'closed'].includes(status)) return;
  await data.setGroupEnquiryStatus(s(fd, 'id'), status);
  revalidatePath('/admin');
}
export async function adminSetEnrollmentStatus(fd: FormData) {
  await requireRole(['admin'], '/admin');
  const status = s(fd, 'status') as EnquiryStatus;
  if (!['new', 'contacted', 'converted', 'closed'].includes(status)) return;
  await data.setEnrollmentStatus(s(fd, 'id'), status);
  revalidatePath('/admin');
}
export async function adminSetApplicationStatus(fd: FormData) {
  await requireRole(['admin'], '/admin');
  const status = s(fd, 'status') as ApplicationStatus;
  if (!['reviewing', 'approved', 'rejected'].includes(status)) return;
  const app = (await data.listApplications()).find((a) => a.id === s(fd, 'id'));
  if (!app) return;
  await data.setApplicationStatus(app.id, status);
  // Approving an application from a signed-in user upgrades their account role.
  if (status === 'approved' && app.user_id) await data.setProfileRole(app.user_id, app.type === 'faculty' ? 'faculty' : 'professional');
  revalidatePath('/admin');
}
export async function adminSetRole(fd: FormData) {
  const me = await requireRole(['admin'], '/admin');
  const role = s(fd, 'role') as Role;
  const id = s(fd, 'id');
  if (!['learner', 'professional', 'faculty', 'franchise', 'admin'].includes(role) || id === me.id) return;
  await data.setProfileRole(id, role);
  revalidatePath('/admin');
}

/* Admin: add a course (with optional cover image upload) */
const LEVELS = ['Basic', 'Foundation', 'Certification', 'Master', 'Advanced', 'Pro Master'] as const;
const MODES = ['Online', 'Offline', 'Online & offline'] as const;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const slugify = (t: string) => t.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
const lines = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean);

export async function adminCreateCourseAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireRole(['admin'], '/admin');
  const keep = Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === 'string')) as Record<string, string>;
  const fail = (error: string): ActionState => ({ error, fields: keep });

  const p = z.object({
    title: z.string().trim().min(4, 'Enter a course title (at least 4 characters)').max(120),
    category_slug: z.string().min(1, 'Choose a category'),
    level: z.enum(LEVELS, { errorMap: () => ({ message: 'Choose a level' }) }),
    mode: z.enum(MODES, { errorMap: () => ({ message: 'Choose a mode' }) }),
    duration_days: z.coerce.number().int('Duration must be whole days').min(1, 'Duration must be at least 1 day').max(1000),
    price: z.coerce.number().int('Fee must be a whole number of rupees').min(0, 'Fee cannot be negative').max(10_000_000),
    language: z.string().trim().min(2, 'Enter the teaching language(s)').max(80),
    summary: z.string().trim().min(10, 'Add a one-line summary (at least 10 characters)').max(220),
    description: z.string().trim().max(4000).default(''),
    faculty_id: z.string().default(''),
  }).safeParse({
    title: fd.get('title'), category_slug: fd.get('category_slug'), level: fd.get('level'), mode: fd.get('mode'),
    duration_days: fd.get('duration_days'), price: fd.get('price'), language: fd.get('language'),
    summary: fd.get('summary'), description: fd.get('description') ?? '', faculty_id: fd.get('faculty_id') ?? '',
  });
  if (!p.success) return fail(p.error.issues[0].message);
  const v = p.data;

  const categories = await data.listCategories();
  if (!categories.some((c) => c.slug === v.category_slug)) return fail('Choose a valid category');
  if (v.faculty_id && !(await data.getFaculty(v.faculty_id))) return fail('Choose a valid faculty member');

  // Modules: one per line, "Module title | days"
  const modules = [];
  for (const l of lines(s(fd, 'modules'))) {
    const [t, d] = l.split('|').map((x) => x.trim());
    const days = d ? Number(d) : 1;
    if (!t || !Number.isInteger(days) || days < 1) return fail(`Check this module line: "${l}". Use "Module title | days".`);
    modules.push({ title: t, days });
  }

  // Slug: from the title, made unique
  const base = slugify(s(fd, 'slug') || v.title);
  if (!base) return fail('The title needs some letters or numbers');
  let slug = base;
  for (let i = 2; await data.courseSlugTaken(slug); i++) slug = `${base}-${i}`;

  // Cover image (optional)
  let image_url: string | null = null;
  const file = fd.get('image');
  if (file instanceof File && file.size > 0) {
    if (!IMAGE_TYPES.includes(file.type)) return fail('Cover image must be a JPG, PNG or WebP file');
    if (file.size > MAX_IMAGE_BYTES) return fail('Cover image must be 5 MB or smaller');
    try {
      image_url = await data.uploadCourseImage(file, slug);
    } catch (e) {
      return fail(e instanceof Error ? e.message : 'Image upload failed');
    }
  }

  const published = fd.get('published') === 'on';
  await data.createCourse({
    slug, title: v.title, category_slug: v.category_slug, level: v.level, mode: v.mode,
    duration_days: v.duration_days, price: v.price, language: v.language, summary: v.summary,
    description: v.description, outcomes: lines(s(fd, 'outcomes')), modules,
    faculty_id: v.faculty_id || null, featured: fd.get('featured') === 'on', image_url, published,
  });

  revalidatePath('/admin');
  revalidatePath('/courses');
  revalidatePath('/');
  return {
    ok: true,
    message: published ? `"${v.title}" is live at /courses/${slug}.` : `"${v.title}" was saved as a draft (not shown on the site).`,
    fields: { slug },
  };
}

/* ------------------------------------------------------------------ learning (learner dashboard) */
async function canUseCourse(userId: string, role: Role, courseId: string) {
  if (role === 'admin') return true;
  return (await lms.enrolledCourseIds(userId)).includes(courseId);
}

export async function submitQuizAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Please log in again.' };
  const quiz = await lms.getQuiz(s(fd, 'quiz_id'));
  if (!quiz || !quiz.published) return { error: 'This quiz is not available.' };
  if (!(await canUseCourse(user.id, user.profile.role, quiz.course_id))) return { error: 'This quiz is for learners enrolled in the course.' };
  const answers = quiz.questions.map((_q, i) => Number(fd.get(`q${i}`)) || 0);
  if (answers.some((a) => a === 0)) return { error: 'Answer every question before submitting.' };
  const score = quiz.questions.reduce((n, q, i) => n + (answers[i] === q.correct ? 1 : 0), 0);
  const max = quiz.questions.length;
  const passed = max > 0 && (score / max) * 100 >= quiz.pass_percent;
  await lms.createSubmission({ kind: 'quiz', quiz_id: quiz.id, assignment_id: null, course_id: quiz.course_id, user_id: user.id, student_name: user.profile.full_name || user.email || 'Learner', answer: '', answers, score, max_score: max, status: 'graded' });
  revalidatePath('/dashboard');
  return { ok: true, message: `You scored ${score} out of ${max} — ${passed ? 'passed 🎉' : `pass mark is ${quiz.pass_percent}%. You can try again.`}` };
}

export async function submitAssignmentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Please log in again.' };
  const a = await lms.getAssignment(s(fd, 'assignment_id'));
  if (!a || !a.published) return { error: 'This assignment is not available.' };
  if (!(await canUseCourse(user.id, user.profile.role, a.course_id))) return { error: 'This assignment is for learners enrolled in the course.' };
  const answer = s(fd, 'answer').trim();
  if (answer.length < 3) return { error: 'Write your answer or paste a link to your work (Google Drive, photos…).' };
  if (answer.length > 5000) return { error: 'Keep your answer under 5,000 characters. Paste a link for longer work.' };
  await lms.createSubmission({ kind: 'assignment', quiz_id: null, assignment_id: a.id, course_id: a.course_id, user_id: user.id, student_name: user.profile.full_name || user.email || 'Learner', answer, answers: [], score: null, max_score: a.max_marks });
  revalidatePath('/dashboard');
  return { ok: true, message: 'Submitted. Your faculty will grade it soon.' };
}

export async function submitReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Please log in again.' };
  const courseId = s(fd, 'course_id');
  if (!(await canUseCourse(user.id, user.profile.role, courseId))) return { error: 'Only enrolled learners can review this course.' };
  const p = z.object({ rating: z.coerce.number().int().min(1, 'Choose a star rating').max(5), comment: z.string().trim().min(10, 'Write at least a sentence').max(1000) })
    .safeParse({ rating: fd.get('rating'), comment: fd.get('comment') });
  if (!p.success) return { error: p.error.issues[0].message };
  if ((await lms.reviewsByUser(user.id)).some((r) => r.course_id === courseId)) return { error: 'You have already reviewed this course. Thank you!' };
  await lms.createReview({ course_id: courseId, user_id: user.id, name: user.profile.full_name || 'Learner', rating: p.data.rating, comment: p.data.comment });
  revalidatePath('/dashboard');
  return { ok: true, message: 'Thanks! Your review will appear on the course page after a quick check.' };
}

/* ------------------------------------------------------------------ support tickets (any signed-in user) */
export async function createTicketAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Please log in again.' };
  const p = z.object({
    subject: z.string().trim().min(4, 'Add a short subject').max(140),
    category: z.enum(['General', 'Courses', 'Bookings', 'Certificates', 'Account', 'Technical']),
    text: z.string().trim().min(10, 'Tell us a little more (at least 10 characters)').max(5000),
  }).safeParse({ subject: fd.get('subject'), category: fd.get('category') || 'General', text: fd.get('text') });
  if (!p.success) return { error: p.error.issues[0].message };
  const t = await lms.createTicket({ user_id: user.id, name: user.profile.full_name || user.email || 'User', email: user.email, phone: user.profile.phone, ...p.data });
  await notifyEnquiry('Contact message', { name: user.profile.full_name, phone: user.profile.phone, email: user.email, details: `Support ticket: ${p.data.subject}` });
  revalidatePath('/dashboard');
  redirect(`/dashboard/support/${t.id}`);
}

export async function userTicketReplyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Please log in again.' };
  const t = await lms.getTicket(s(fd, 'id'));
  if (!t || t.user_id !== user.id) return { error: 'Ticket not found.' };
  const text = s(fd, 'text').trim();
  if (text.length < 2) return { error: 'Write a message.' };
  await lms.addTicketMessage(t, { from: 'user', name: user.profile.full_name || 'You', text: text.slice(0, 5000), at: new Date().toISOString() }, t.status === 'resolved' || t.status === 'closed' ? 'open' : undefined);
  revalidatePath(`/dashboard/support/${t.id}`);
  return { ok: true, message: 'Sent.' };
}

/* ------------------------------------------------------------------ faculty: grade submissions for own courses */
export async function facultyGradeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireRole(['faculty', 'admin'], '/dashboard/faculty');
  const sub = await lms.getSubmission(s(fd, 'id'));
  if (!sub) return { error: 'Submission not found.' };
  if (user.profile.role !== 'admin') {
    const fac = await data.getFacultyForUser(user.id);
    const mine = fac ? (await data.coursesForFaculty(fac.id)).map((c) => c.id) : [];
    if (!sub.course_id || !mine.includes(sub.course_id)) return { error: 'You can only grade your own courses.' };
  }
  const p = z.object({
    score: z.coerce.number().int('Whole numbers only').min(0, 'Score can’t be negative').max(sub.max_score ?? 1000, `Score can’t be more than ${sub.max_score ?? 1000}`),
    feedback: z.string().trim().max(2000).default(''),
    status: z.enum(['graded', 'returned']),
  }).safeParse({ score: fd.get('score'), feedback: fd.get('feedback') ?? '', status: fd.get('status') || 'graded' });
  if (!p.success) return { error: p.error.issues[0].message };
  await lms.gradeSubmission(sub.id, { score: p.data.score, feedback: p.data.feedback, status: p.data.status });
  revalidatePath('/dashboard/faculty');
  return { ok: true, message: 'Saved.' };
}
