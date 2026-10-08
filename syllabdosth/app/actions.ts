'use server';
/** Public form actions: bookings, enquiries, applications, newsletter, contact. */
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { ActionState } from '@/lib/action-state';
import { getCurrentUser } from '@/lib/auth';
import * as data from '@/lib/data';
import { todayIST } from '@/lib/format';
import { notifyEnquiry } from '@/lib/mailer';

const phone = z
  .string()
  .trim()
  .regex(/^(\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/, 'Enter a valid 10-digit Indian mobile number');
const name = z.string().trim().min(2, 'Enter your name').max(80);
const email = z.string().trim().email('Enter a valid email address');
const futureDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date')
  .refine((d) => d >= todayIST(), 'Choose today or a future date');

function firstError(e: z.ZodError) {
  return e.issues[0]?.message ?? 'Please check the form';
}
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '');

/* ---------------------------- Service booking ---------------------------- */
const bookingSchema = z.object({
  service_id: z.string().min(1),
  professional_id: z.string().min(1, 'Choose a professional'),
  name,
  phone,
  preferred_date: futureDate,
  preferred_time: z.string().regex(/^\d{2}:\d{2}$/, 'Choose a time'),
  location: z.string().trim().min(5, 'Enter the address or venue'),
  requirements: z.string().trim().max(1000).optional().default(''),
});

export async function createBookingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = bookingSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const service = await data.getServiceById(parsed.data.service_id);
  const pro = await data.getProfessional(parsed.data.professional_id);
  if (!service || !pro || !pro.verified || !pro.service_ids.includes(service.id)) return { error: 'That professional is not available for this service.' };
  const user = await getCurrentUser();
  const id = await data.createBooking({ ...parsed.data, customer_id: user?.id ?? null, price_from: service.price_from });
  await notifyEnquiry('Booking', { name: parsed.data.name, phone: parsed.data.phone, email: user?.email ?? '', details: `${service.title} with ${pro.name} on ${parsed.data.preferred_date} ${parsed.data.preferred_time} at ${parsed.data.location}` });
  redirect(`/bookings/${id}/sent`);
}

export async function cancelBookingAction(fd: FormData) {
  const id = str(fd, 'id');
  const booking = await data.getBooking(id);
  if (!booking) return;
  const user = await getCurrentUser();
  // The customer (or anyone holding the private booking link, for guest bookings) can cancel while pending.
  const allowed = booking.customer_id ? booking.customer_id === user?.id || user?.profile.role === 'admin' : true;
  if (allowed && (booking.status === 'pending' || booking.status === 'confirmed')) await data.setBookingStatus(id, 'cancelled');
  revalidatePath(`/bookings/${id}`);
}

/* ------------------------------ Group booking ------------------------------ */
const groupSchema = z.object({
  name,
  phone,
  email,
  people: z.coerce.number().int().min(2, 'Group bookings start at 2 people').max(2000),
  preferred_date: futureDate,
  event_type: z.string().trim().min(2, 'Tell us the service or event type'),
  location: z.string().trim().min(3, 'Enter the location'),
  requirements: z.string().trim().max(2000).optional().default(''),
});

export async function groupEnquiryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = groupSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  await data.createGroupEnquiry(parsed.data);
  const g = parsed.data;
  await notifyEnquiry('Group enquiry', { name: g.name, phone: g.phone, email: g.email, people: g.people, date: g.preferred_date, details: `${g.people} people · ${g.event_type} · ${g.preferred_date} · ${g.location}` }, 'group_enquiry_received', g.email);
  redirect('/group-booking/sent');
}

/* -------------------------------- Enrollment -------------------------------- */
const enrollSchema = z.object({
  course_id: z.string().min(1),
  name,
  phone,
  email,
  mode: z.enum(['Online', 'Offline', 'Either']),
  message: z.string().trim().max(1000).optional().default(''),
});

export async function enrollAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = enrollSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const course = await data.getCourseById(parsed.data.course_id);
  if (!course) return { error: 'Course not found.' };
  const user = await getCurrentUser();
  await data.createEnrollment({ ...parsed.data, user_id: user?.id ?? null });
  const e = parsed.data;
  await notifyEnquiry('Course enquiry', { name: e.name, phone: e.phone, email: e.email, course: course.title, details: `${course.title} · ${e.mode}${e.message ? ` · ${e.message}` : ''}` }, 'enrollment_received', e.email);
  redirect(`/courses/${course.slug}/enroll/sent`);
}

/* ------------------------------- Applications ------------------------------- */
const applySchema = z.object({
  type: z.enum(['faculty', 'professional']),
  name,
  phone,
  email,
  city: z.string().trim().min(2, 'Enter your city'),
  skill: z.string().trim().min(2, 'Tell us your skill'),
  experience_years: z.coerce.number().int().min(0).max(60),
  message: z.string().trim().max(2000).optional().default(''),
});

export async function applyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = applySchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const user = await getCurrentUser();
  await data.createApplication({ ...parsed.data, user_id: user?.id ?? null });
  const a = parsed.data;
  await notifyEnquiry('Application', { name: a.name, phone: a.phone, email: a.email, type: a.type, details: `${a.type} · ${a.skill} · ${a.experience_years} yrs · ${a.city}` }, 'application_received', a.email);
  redirect(`/apply/sent?type=${parsed.data.type}`);
}

/* ------------------------------ Newsletter & contact ------------------------------ */
export async function subscribeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = email.safeParse(str(fd, 'email'));
  if (!parsed.success) return { error: firstError(parsed.error) };
  await data.subscribe(parsed.data.toLowerCase());
  return { ok: true, message: 'You’re subscribed. New courses land in your inbox about twice a month.' };
}

const contactSchema = z.object({
  name,
  phone,
  email,
  topic: z.string().min(1),
  message: z.string().trim().min(5, 'Write a short message').max(2000),
});

export async function contactAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  await data.createContactMessage(parsed.data);
  await notifyEnquiry('Contact message', { name: parsed.data.name, phone: parsed.data.phone, email: parsed.data.email, details: `${parsed.data.topic}: ${parsed.data.message}` });
  return { ok: true, message: 'Thanks — we’ll get back to you within one working day.' };
}
