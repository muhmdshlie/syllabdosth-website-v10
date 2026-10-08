'use server';
/** Admin panel actions. Every action starts with requireRole(['admin']). */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ActionState } from '@/lib/action-state';
import * as crud from '@/lib/admin/crud';
import { getResource } from '@/lib/admin/resources';
import type { Row } from '@/lib/admin/types';
import { coerceValues } from '@/lib/admin/validate';
import { requireRole, type CurrentUser } from '@/lib/auth';
import { getContent, resetContent, saveContent } from '@/lib/cms/content';
import { CONTENT } from '@/lib/cms/schema';
import { isDemo } from '@/lib/config';
import * as data from '@/lib/data';
import { sendRaw, sendTemplate } from '@/lib/mailer';
import { deleteMedia, listMedia, updateMediaAlt, uploadMedia } from '@/lib/media';
import type { MediaItem, Profile, Role, TicketMessage } from '@/lib/types';

const s = (fd: FormData, k: string) => String(fd.get(k) ?? '');
const actorOf = (u: CurrentUser) => ({ id: u.id, name: u.profile.full_name || u.email || 'Admin' });
const refresh = () => revalidatePath('/', 'layout');

function parsePayload(fd: FormData): Row {
  try {
    const v = JSON.parse(s(fd, 'payload') || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch { return {}; }
}

/* ------------------------------------------------------------------ records */
async function beforeSave(resource: string, id: string | null, values: Row, before: Row | null, me: CurrentUser): Promise<string | null> {
  if ((resource === 'users' || resource === 'students') && id === me.id) {
    if (values.role && values.role !== me.profile.role) return 'You can’t change your own role.';
    if (values.status === 'blocked') return 'You can’t block your own account.';
  }
  if (resource === 'staff' && before?.user_id === me.id && values.user_id !== me.id) return 'You can’t remove your own admin access.';
  if (resource === 'tickets') values.updated_at = new Date().toISOString();
  if (resource === 'quizzes' && Array.isArray(values.questions) && values.published && values.questions.length === 0) return 'Add at least one question before publishing the quiz.';
  return null;
}

async function roleFor(userId: unknown, role: Role) {
  if (!userId) return;
  const p = (await data.listProfiles()).find((x) => x.id === userId);
  if (p && p.role !== 'admin') await data.setProfileRole(String(userId), role);
}

async function afterSave(resource: string, row: Row, before: Row | null, creating: boolean, me: CurrentUser) {
  if (resource === 'staff') {
    if (row.user_id) await data.setProfileRole(String(row.user_id), 'admin');
    if (before?.user_id && before.user_id !== row.user_id && before.user_id !== me.id) await data.setProfileRole(String(before.user_id), 'learner');
  }
  if (resource === 'instructors' && row.user_id && row.user_id !== before?.user_id) await roleFor(row.user_id, 'faculty');
  if (resource === 'professionals' && row.user_id && row.user_id !== before?.user_id) await roleFor(row.user_id, 'professional');
  if (resource === 'applications' && row.status === 'approved' && before?.status !== 'approved' && row.user_id) await roleFor(row.user_id, row.type === 'faculty' ? 'faculty' : 'professional');
  if (resource === 'notifications' && creating && row.send_email) {
    const sent = await emailNotification(row);
    await crud.updateRecord(getResource('notifications')!, String(row.id), { sent_count: sent });
  }
}

async function emailNotification(n: Row): Promise<number> {
  const people = (await data.listProfiles()).filter((p: Profile) =>
    p.email && p.status !== 'blocked' && (n.audience === 'all' || (n.audience === 'user' ? p.id === n.user_id : p.role === n.audience)));
  let sent = 0;
  for (const p of people.slice(0, 500)) {
    const link = n.link ? (String(n.link).startsWith('http') ? String(n.link) : `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}${n.link}`) : '';
    await sendTemplate('notification', p.email, { title: String(n.title), body: String(n.body), link, name: p.full_name });
    sent++;
  }
  return sent;
}

export async function saveRecordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireRole(['admin'], '/admin');
  const r = getResource(s(fd, 'resource'));
  if (!r) return { error: 'Unknown section' };
  const id = s(fd, 'id') || null;
  const creating = !id;
  if (creating && r.noCreate) return { error: `New ${r.label.toLowerCase()} can’t be added here.` };
  if (!creating && r.noEdit) return { error: 'This can’t be edited.' };

  const { values, error } = coerceValues(r.fields, parsePayload(fd), { creating });
  if (error || !values) return { error };
  const before = id ? await crud.getRecord(r, id) : null;
  if (id && !before) return { error: `That ${r.singular} no longer exists.` };
  // Relations must point at real records.
  for (const f of r.fields.filter((x) => x.type === 'relation' && !x.readonly && values[x.name])) {
    const opts = (await crud.relationOptions([f.to!]))[f.to!] ?? [];
    if (!opts.some((o) => o.value === values[f.name])) return { error: `${f.label}: choose from the list` };
  }
  const blocked = await beforeSave(r.key, id, values, before, me);
  if (blocked) return { error: blocked };

  let row: Row;
  try {
    await crud.fillSlugs(r, values, id ?? undefined);
    row = creating ? await crud.createRecord(r, values) : await crud.updateRecord(r, id!, values);
    await afterSave(r.key, row, before, creating, me);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not save' };
  }
  const name = String(row[r.titleField] ?? row[r.pk]);
  await crud.logActivity(actorOf(me), creating ? 'create' : 'update', r.label, String(row[r.pk]), `${creating ? 'Added' : 'Edited'} ${r.singular} “${name}”`);
  refresh();
  if (creating) redirect(`/admin/${r.key}/${encodeURIComponent(String(row[r.pk]))}?saved=1`);
  return { ok: true, message: `Saved “${name}”.` };
}

export async function deleteRecordAction(fd: FormData) {
  const me = await requireRole(['admin'], '/admin');
  const r = getResource(s(fd, 'resource'));
  const id = s(fd, 'id');
  if (!r || r.noDelete || !id) return;
  const row = await crud.getRecord(r, id);
  if (!row) return;
  if (r.key === 'staff' && row.user_id === me.id) return;
  let failed = '';
  try {
    await crud.deleteRecord(r, id);
    if (r.key === 'staff' && row.user_id) await data.setProfileRole(String(row.user_id), 'learner');
    await crud.logActivity(actorOf(me), 'delete', r.label, id, `Deleted ${r.singular} “${String(row[r.titleField] ?? id)}”`);
  } catch (e) {
    failed = e instanceof Error ? e.message : 'Could not delete';
  }
  refresh();
  const back = s(fd, 'back');
  if (failed) redirect(`/admin/${r.key}${back === 'edit' ? `/${encodeURIComponent(id)}` : ''}?error=${encodeURIComponent(failed)}`);
  if (back === 'edit') redirect(`/admin/${r.key}?deleted=1`);
}

/** Inline status / on-off changes from list pages. */
export async function quickSetAction(fd: FormData) {
  const me = await requireRole(['admin'], '/admin');
  const r = getResource(s(fd, 'resource'));
  const id = s(fd, 'id');
  const field = r?.fields.find((f) => f.name === s(fd, 'field') && (f.type === 'select' || f.type === 'bool') && !f.readonly);
  if (!r || !field || r.noEdit) return;
  const { values, error } = coerceValues([field], { [field.name]: s(fd, 'value') }, { creating: false });
  if (error || !values) return;
  const before = await crud.getRecord(r, id);
  if (!before) return;
  if (await beforeSave(r.key, id, values, before, me)) return;
  const row = await crud.updateRecord(r, id, values);
  await afterSave(r.key, row, before, false, me);
  await crud.logActivity(actorOf(me), 'update', r.label, id, `${field.label} → ${String(values[field.name])} for “${String(row[r.titleField] ?? id)}”`);
  refresh();
}

/* ------------------------------------------------------------------ CMS & settings */
export async function saveContentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireRole(['admin'], '/admin');
  const key = s(fd, 'key');
  const def = CONTENT[key];
  if (!def) return { error: 'Unknown section' };
  const { values, error } = coerceValues(def.fields, parsePayload(fd), { creating: true });
  if (error || !values) return { error };
  try {
    await saveContent(key, values, isDemo ? null : me.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not save' };
  }
  await crud.logActivity(actorOf(me), 'settings', def.kind === 'page' ? 'CMS' : 'Settings', key, `Updated ${def.title}`);
  refresh();
  return { ok: true, message: `${def.title} saved. The website is updated.` };
}

export async function resetContentAction(fd: FormData) {
  const me = await requireRole(['admin'], '/admin');
  const key = s(fd, 'key');
  const def = CONTENT[key];
  if (!def) return;
  await resetContent(key);
  await crud.logActivity(actorOf(me), 'settings', def.kind === 'page' ? 'CMS' : 'Settings', key, `Reset ${def.title} to the original content`);
  refresh();
  redirect(`${s(fd, 'back') || '/admin'}?reset=1`);
}

/* ------------------------------------------------------------------ media */
export type UploadResult = { ok?: boolean; error?: string; item?: MediaItem };

export async function uploadMediaAction(fd: FormData): Promise<UploadResult> {
  const me = await requireRole(['admin'], '/admin');
  const files = fd.getAll('file').filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: 'Choose a file to upload.' };
  try {
    let item: MediaItem | undefined;
    for (const f of files.slice(0, 20)) item = await uploadMedia(f, s(fd, 'folder') || 'general', s(fd, 'alt'));
    await crud.logActivity(actorOf(me), 'upload', 'Media library', item?.id ?? null, `Uploaded ${files.length === 1 ? `“${files[0].name}”` : `${files.length} files`}`);
    revalidatePath('/admin/media');
    return { ok: true, item };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Upload failed' };
  }
}

export async function uploadMediaFormAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await uploadMediaAction(fd);
  return res.error ? { error: res.error } : { ok: true, message: 'Uploaded.' };
}

export async function listMediaAction(q: string): Promise<MediaItem[]> {
  await requireRole(['admin'], '/admin');
  return listMedia(q, 120);
}

export async function deleteMediaAction(fd: FormData) {
  const me = await requireRole(['admin'], '/admin');
  const id = s(fd, 'id');
  await deleteMedia(id);
  await crud.logActivity(actorOf(me), 'delete', 'Media library', id, 'Deleted a file');
  revalidatePath('/admin/media');
}

export async function updateMediaAltAction(fd: FormData) {
  await requireRole(['admin'], '/admin');
  await updateMediaAlt(s(fd, 'id'), s(fd, 'alt').slice(0, 200));
  revalidatePath('/admin/media');
}

/* ------------------------------------------------------------------ system */
export async function clearCacheAction() {
  const me = await requireRole(['admin'], '/admin');
  refresh();
  await crud.logActivity(actorOf(me), 'cache', 'System', null, 'Cleared the website cache');
}

export async function sendTestEmailAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireRole(['admin'], '/admin');
  const to = s(fd, 'to').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { error: 'Enter an email address to send the test to.' };
  const err = await sendRaw(to, 'Test email from Syllabdosth', 'If you can read this, the website can send emails. 🎉');
  return err ? { error: err } : { ok: true, message: `Test email sent to ${to}.` };
}

/* ------------------------------------------------------------------ support tickets */
export async function adminTicketReplyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireRole(['admin'], '/admin');
  const r = getResource('tickets')!;
  const id = s(fd, 'id');
  const text = s(fd, 'text').trim();
  const status = s(fd, 'status');
  const ticket = await crud.getRecord(r, id);
  if (!ticket) return { error: 'Ticket not found' };
  if (!text && !status) return { error: 'Write a reply' };
  const messages = [...((ticket.messages as TicketMessage[]) ?? [])];
  if (text) messages.push({ from: 'admin', name: me.profile.full_name || 'Syllabdosth team', text: text.slice(0, 5000), at: new Date().toISOString() });
  const patch: Row = { messages, updated_at: new Date().toISOString() };
  if (['open', 'in_progress', 'resolved', 'closed'].includes(status)) patch.status = status;
  else if (text && ticket.status === 'open') patch.status = 'in_progress';
  await crud.updateRecord(r, id, patch);
  if (text) await sendTemplate('ticket_reply', String(ticket.email ?? ''), { name: String(ticket.name), subject: String(ticket.subject), reply: text });
  await crud.logActivity(actorOf(me), 'update', 'Support tickets', id, `Replied to “${String(ticket.subject)}”`);
  revalidatePath(`/admin/tickets/${id}`);
  revalidatePath('/dashboard');
  return { ok: true, message: text ? 'Reply sent.' : 'Status updated.' };
}

/* ------------------------------------------------------------------ AI assistant */
const AI_TASKS: Record<string, string> = {
  course: 'Write a course description for an Indian skill-development course page: a one-line summary, a 120-word "About this course" paragraph, and 6 "What you will learn" bullet points.',
  blog: 'Write a blog post draft (about 500 words) with a title, a short intro and 3–5 sections with headings.',
  social: 'Write 3 short Instagram captions with relevant hashtags, and one WhatsApp broadcast message.',
  email: 'Write a friendly, professional email reply.',
  faq: 'Write 5 frequently asked questions with short answers.',
  improve: 'Improve and correct this text. Keep the meaning, make it clear and friendly.',
  translate: 'Translate this text into Kannada and Hindi. Keep names and course titles in English.',
};

export async function aiAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireRole(['admin'], '/admin');
  const task = AI_TASKS[s(fd, 'task')] ? s(fd, 'task') : 'improve';
  const input = s(fd, 'input').trim().slice(0, 6000);
  const tone = s(fd, 'tone') || 'warm and professional';
  const keep = { task, input, tone };
  if (input.length < 3) return { error: 'Tell the assistant what to write about.', fields: keep };
  const addons = await getContent<{ ai: { enabled: boolean; apiKey: string; model: string } }>('settings.addons');
  if (!addons.ai.enabled) return { error: 'The AI Assistant is switched off in Addon settings.', fields: keep };
  const key = addons.ai.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) return { error: 'Add your Anthropic API key in Addon → AI Assistant (or ANTHROPIC_API_KEY on the server) to use this.', fields: keep };
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: addons.ai.model || 'claude-sonnet-5-5', max_tokens: 1500,
        system: 'You write marketing and course content for Syllabdosth, a skill-development platform in Karnataka, India, teaching tailoring, beautician, nail art, mehandi, embroidery and saree draping, and listing certified professionals for bookings. Use Indian English and ₹. Plain text, no markdown headings with #.',
        messages: [{ role: 'user', content: `${AI_TASKS[task]}\nTone: ${tone}.\n\n${input}` }],
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: `AI error: ${body?.error?.message ?? res.statusText}`, fields: keep };
    const text = (body.content ?? []).filter((c: { type: string }) => c.type === 'text').map((c: { text: string }) => c.text).join('\n').trim();
    return { ok: true, message: text || '(no answer)', fields: keep };
  } catch (e) {
    return { error: `Could not reach the AI service: ${e instanceof Error ? e.message : 'network error'}`, fields: keep };
  }
}
