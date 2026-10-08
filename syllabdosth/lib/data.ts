import 'server-only';
/**
 * Single data-access layer. Every page and action goes through here.
 * - Real mode: Supabase (service-role client on the server; callers check permissions first).
 * - Demo mode: sample data from lib/demo-data.ts + an in-memory store for anything submitted.
 */
import { isDemo } from './config';
import { newId, table } from './store';
import { createAdminClient } from './supabase/server';
import type {
  Application, ApplicationStatus, BlogPost, Booking, BookingStatus, Category, Course, EnquiryStatus,
  EnrollmentEnquiry, Faculty, GroupEnquiry, Professional, Profile, Role, Service,
} from './types';

const T = table; // demo-mode tables (lib/store.ts)

function db() {
  return createAdminClient();
}
function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/* ----------------------------- Catalogue ----------------------------- */
export async function listCategories(): Promise<Category[]> {
  if (isDemo) return [...T<Category & { sort: number }>('categories')].sort((a, b) => a.sort - b.sort);
  return must(await db().from('categories').select('*').order('sort'));
}

export type CourseFilter = { category?: string; level?: string; duration?: string; price?: string; q?: string; sort?: string };

export async function listCourses(f: CourseFilter = {}): Promise<Course[]> {
  let rows: Course[] = isDemo ? T<Course>('courses').filter((c) => c.published !== false) : must(await db().from('courses').select('*').eq('published', true));
  if (f.category) rows = rows.filter((c) => c.category_slug === f.category);
  if (f.level) rows = rows.filter((c) => c.level === f.level);
  if (f.duration) {
    const [min, max] = f.duration.split('-').map(Number);
    rows = rows.filter((c) => c.duration_days >= min && c.duration_days <= (max || 9999));
  }
  if (f.price) {
    const [min, max] = f.price.split('-').map(Number);
    rows = rows.filter((c) => c.price >= min && c.price <= (max || 9_999_999));
  }
  if (f.q) {
    const q = f.q.toLowerCase();
    rows = rows.filter((c) => c.title.toLowerCase().includes(q) || c.summary.toLowerCase().includes(q));
  }
  const sorted = [...rows];
  if (f.sort === 'price-asc') sorted.sort((a, b) => a.price - b.price);
  else if (f.sort === 'price-desc') sorted.sort((a, b) => b.price - a.price);
  else if (f.sort === 'popular') sorted.sort((a, b) => b.students - a.students);
  return sorted;
}

export async function featuredCourses(): Promise<Course[]> {
  const all = await listCourses();
  const f = all.filter((c) => c.featured);
  return (f.length ? f : all).slice(0, 4);
}

export async function getCourse(slug: string): Promise<Course | null> {
  if (isDemo) return T<Course>('courses').find((c) => c.slug === slug && c.published !== false) ?? null;
  return must(await db().from('courses').select('*').eq('slug', slug).eq('published', true).maybeSingle());
}
export async function getCourseById(id: string): Promise<Course | null> {
  if (isDemo) return T<Course>('courses').find((c) => c.id === id && c.published !== false) ?? null;
  return must(await db().from('courses').select('*').eq('id', id).eq('published', true).maybeSingle());
}

/* ------------------------------ Admin: add courses ------------------------------ */
export type NewCourse = Omit<Course, 'id' | 'rating' | 'ratings_count' | 'students'>;

/** True if any course (published or not) already uses this slug. */
export async function courseSlugTaken(slug: string): Promise<boolean> {
  if (isDemo) return T<Course>('courses').some((c) => c.slug === slug);
  const row = must(await db().from('courses').select('id').eq('slug', slug).maybeSingle());
  return !!row;
}

export async function createCourse(c: NewCourse & { published: boolean }): Promise<Course> {
  if (isDemo) {
    const course: Course = { ...c, id: newId('c'), rating: 5, ratings_count: 0, students: 0 };
    T<Course>('courses').unshift({ ...course, created_at: new Date().toISOString() } as Course);
    return course;
  }
  return must(await db().from('courses').insert(c).select('*').single());
}

export const COURSE_IMAGE_BUCKET = 'course-images';

/** Uploads a course cover to Supabase Storage and returns its public URL. */
export async function uploadCourseImage(file: File, slug: string): Promise<string> {
  const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[file.type] ?? 'jpg';
  if (isDemo) {
    // Demo mode has no storage: keep the image in memory as a data URL.
    const b64 = Buffer.from(await file.arrayBuffer()).toString('base64');
    return `data:${file.type};base64,${b64}`;
  }
  const client = db();
  const path = `${slug}-${Date.now().toString(36)}.${ext}`;
  const put = () => client.storage.from(COURSE_IMAGE_BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
  let { error } = await put();
  if (error && /bucket not found/i.test(error.message)) {
    // First upload on a fresh project: create the public bucket, then retry.
    await client.storage.createBucket(COURSE_IMAGE_BUCKET, { public: true, fileSizeLimit: 5 * 1024 * 1024, allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] });
    ({ error } = await put());
  }
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  return client.storage.from(COURSE_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function relatedCourses(course: Course): Promise<Course[]> {
  const all = await listCourses();
  return all.filter((c) => c.id !== course.id && c.category_slug === course.category_slug).slice(0, 3);
}

export async function listServices(): Promise<Service[]> {
  if (isDemo) return T<Service & { sort: number; published: boolean }>('services').filter((s) => s.published).sort((a, b) => a.sort - b.sort);
  return must(await db().from('services').select('*').eq('published', true).order('sort'));
}
export async function getService(slug: string): Promise<Service | null> {
  if (isDemo) return T<Service & { published: boolean }>('services').find((s) => s.slug === slug && s.published) ?? null;
  return must(await db().from('services').select('*').eq('slug', slug).eq('published', true).maybeSingle());
}
export async function getServiceById(id: string): Promise<Service | null> {
  if (isDemo) return T<Service>('services').find((s) => s.id === id) ?? null;
  return must(await db().from('services').select('*').eq('id', id).maybeSingle());
}

export async function listProfessionals(): Promise<Professional[]> {
  if (isDemo) return [...T<Professional>('professionals')].sort((a, b) => b.rating - a.rating);
  return must(await db().from('professionals').select('*').order('rating', { ascending: false }));
}
export async function professionalsForService(serviceId: string): Promise<Professional[]> {
  const all = await listProfessionals();
  return all.filter((p) => p.verified && p.service_ids.includes(serviceId));
}
export async function getProfessional(id: string): Promise<Professional | null> {
  if (isDemo) return T<Professional>('professionals').find((p) => p.id === id) ?? null;
  return must(await db().from('professionals').select('*').eq('id', id).maybeSingle());
}
export async function getProfessionalBySlug(slug: string): Promise<Professional | null> {
  if (isDemo) return T<Professional>('professionals').find((p) => p.slug === slug && p.verified) ?? null;
  return must(await db().from('professionals').select('*').eq('slug', slug).eq('verified', true).maybeSingle());
}
export async function getProfessionalForUser(userId: string): Promise<Professional | null> {
  if (isDemo) return T<Professional>('professionals').find((p) => p.user_id === userId) ?? null;
  return must(await db().from('professionals').select('*').eq('user_id', userId).maybeSingle());
}

export async function listFaculty(): Promise<Faculty[]> {
  if (isDemo) return [...T<Faculty>('faculty')].sort((a, b) => b.students - a.students);
  return must(await db().from('faculty').select('*').order('students', { ascending: false }));
}
export async function getFaculty(id: string | null): Promise<Faculty | null> {
  if (!id) return null;
  if (isDemo) return T<Faculty>('faculty').find((f) => f.id === id) ?? null;
  return must(await db().from('faculty').select('*').eq('id', id).maybeSingle());
}
export async function getFacultyForUser(userId: string): Promise<Faculty | null> {
  if (isDemo) return T<Faculty>('faculty').find((f) => f.user_id === userId) ?? null;
  return must(await db().from('faculty').select('*').eq('user_id', userId).maybeSingle());
}
export async function coursesForFaculty(facultyId: string): Promise<Course[]> {
  const all = await listCourses();
  return all.filter((c) => c.faculty_id === facultyId);
}

export async function listBlog(): Promise<BlogPost[]> {
  if (isDemo) return T<BlogPost & { published: boolean }>('blog_posts').filter((b) => b.published).sort((a, b) => b.published_at.localeCompare(a.published_at));
  return must(await db().from('blog_posts').select('*').eq('published', true).order('published_at', { ascending: false }));
}
export async function getBlog(slug: string): Promise<BlogPost | null> {
  if (isDemo) return T<BlogPost>('blog_posts').find((b) => b.slug === slug) ?? null;
  return must(await db().from('blog_posts').select('*').eq('slug', slug).maybeSingle());
}

/* ------------------------------ Bookings ------------------------------ */
export type NewBooking = Omit<Booking, 'id' | 'status' | 'created_at'>;

export async function createBooking(b: NewBooking): Promise<string> {
  if (isDemo) {
    const id = newId('bk');
    T<Booking>('bookings').unshift({ ...b, id, status: 'pending', created_at: new Date().toISOString() });
    return id;
  }
  const row = must<{ id: string }>(await db().from('bookings').insert(b).select('id').single());
  return row.id;
}
export async function getBooking(id: string): Promise<Booking | null> {
  if (isDemo) return T<Booking>('bookings').find((b) => b.id === id) ?? null;
  return must(await db().from('bookings').select('*').eq('id', id).maybeSingle());
}
export async function listBookings(by: { customerId?: string; professionalId?: string } = {}): Promise<Booking[]> {
  if (isDemo) {
    return T<Booking>('bookings').filter((b) =>
      (!by.customerId || b.customer_id === by.customerId) && (!by.professionalId || b.professional_id === by.professionalId));
  }
  let q = db().from('bookings').select('*').order('created_at', { ascending: false });
  if (by.customerId) q = q.eq('customer_id', by.customerId);
  if (by.professionalId) q = q.eq('professional_id', by.professionalId);
  return must(await q);
}
export async function setBookingStatus(id: string, status: BookingStatus) {
  if (isDemo) {
    const b = T<Booking>('bookings').find((x) => x.id === id);
    if (b) b.status = status;
    return;
  }
  must(await db().from('bookings').update({ status }).eq('id', id));
}

/* ------------------------------ Enquiries ------------------------------ */
export async function createGroupEnquiry(e: Omit<GroupEnquiry, 'id' | 'status' | 'created_at'>): Promise<string> {
  if (isDemo) {
    const id = newId('gr');
    T<GroupEnquiry>('group_enquiries').unshift({ ...e, id, status: 'new', created_at: new Date().toISOString() });
    return id;
  }
  return (must(await db().from('group_enquiries').insert(e).select('id').single()) as { id: string }).id;
}
export async function listGroupEnquiries(): Promise<GroupEnquiry[]> {
  if (isDemo) return T<GroupEnquiry>('group_enquiries');
  return must(await db().from('group_enquiries').select('*').order('created_at', { ascending: false }));
}
export async function setGroupEnquiryStatus(id: string, status: EnquiryStatus) {
  if (isDemo) { const e = T<GroupEnquiry>('group_enquiries').find((x) => x.id === id); if (e) e.status = status; return; }
  must(await db().from('group_enquiries').update({ status }).eq('id', id));
}

export async function createEnrollment(e: Omit<EnrollmentEnquiry, 'id' | 'status' | 'created_at'>): Promise<string> {
  if (isDemo) {
    const id = newId('en');
    T<EnrollmentEnquiry>('enrollments').unshift({ ...e, id, status: 'new', created_at: new Date().toISOString() });
    return id;
  }
  return (must(await db().from('enrollments').insert(e).select('id').single()) as { id: string }).id;
}
export async function listEnrollments(by: { userId?: string; courseIds?: string[] } = {}): Promise<EnrollmentEnquiry[]> {
  let rows: EnrollmentEnquiry[];
  if (isDemo) rows = T<EnrollmentEnquiry>('enrollments');
  else {
    let q = db().from('enrollments').select('*').order('created_at', { ascending: false });
    if (by.userId) q = q.eq('user_id', by.userId);
    if (by.courseIds) q = q.in('course_id', by.courseIds.length ? by.courseIds : ['00000000-0000-0000-0000-000000000000']);
    return must(await q);
  }
  return rows.filter((e) => (!by.userId || e.user_id === by.userId) && (!by.courseIds || by.courseIds.includes(e.course_id)));
}
export async function setEnrollmentStatus(id: string, status: EnquiryStatus) {
  if (isDemo) { const e = T<EnrollmentEnquiry>('enrollments').find((x) => x.id === id); if (e) e.status = status; return; }
  must(await db().from('enrollments').update({ status }).eq('id', id));
}

export async function createApplication(a: Omit<Application, 'id' | 'status' | 'created_at'>): Promise<string> {
  if (isDemo) {
    const id = newId('ap');
    T<Application>('applications').unshift({ ...a, id, status: 'new', created_at: new Date().toISOString() });
    return id;
  }
  return (must(await db().from('applications').insert(a).select('id').single()) as { id: string }).id;
}
export async function listApplications(): Promise<Application[]> {
  if (isDemo) return T<Application>('applications');
  return must(await db().from('applications').select('*').order('created_at', { ascending: false }));
}
export async function setApplicationStatus(id: string, status: ApplicationStatus) {
  if (isDemo) { const a = T<Application>('applications').find((x) => x.id === id); if (a) a.status = status; return; }
  must(await db().from('applications').update({ status }).eq('id', id));
}

export async function subscribe(email: string) {
  if (isDemo) { const t = T<{ email: string; created_at: string }>('newsletter_subscribers'); if (!t.some((x) => x.email === email)) t.unshift({ email, created_at: new Date().toISOString() }); return; }
  const res = await db().from('newsletter_subscribers').upsert({ email }, { onConflict: 'email' });
  if (res.error) throw new Error(res.error.message);
}
export async function countSubscribers(): Promise<number> {
  if (isDemo) return T('newsletter_subscribers').length;
  const { count } = await db().from('newsletter_subscribers').select('*', { count: 'exact', head: true });
  return count ?? 0;
}

export type ContactMessage = { id: string; name: string; phone: string; email: string; topic: string; message: string; created_at: string };
export async function createContactMessage(m: Omit<ContactMessage, 'id' | 'created_at'>) {
  if (isDemo) { T<ContactMessage & { status: string }>('contact_messages').unshift({ ...m, id: newId('cm'), status: 'new', created_at: new Date().toISOString() }); return; }
  must(await db().from('contact_messages').insert(m));
}
export async function listContactMessages(): Promise<ContactMessage[]> {
  if (isDemo) return T<ContactMessage>('contact_messages');
  return must(await db().from('contact_messages').select('*').order('created_at', { ascending: false }).limit(100));
}

/* ------------------------------- Users ------------------------------- */
export async function listProfiles(): Promise<Profile[]> {
  if (isDemo) return T<Profile>('profiles');
  return must(await db().from('profiles').select('*').order('created_at', { ascending: false }).limit(200));
}
export async function setProfileRole(id: string, role: Role) {
  if (isDemo) { const p = T<Profile>('profiles').find((x) => x.id === id); if (p) p.role = role; return; }
  must(await db().from('profiles').update({ role }).eq('id', id));
}
export async function updateProfile(id: string, patch: { full_name?: string; phone?: string }) {
  if (isDemo) { const p = T<Profile>('profiles').find((x) => x.id === id); if (p) Object.assign(p, patch); return; }
  must(await db().from('profiles').update(patch).eq('id', id));
}
