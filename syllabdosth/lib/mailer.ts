import 'server-only';
/**
 * Outgoing email through the SMTP server set in Admin → Email Settings. Templates live in
 * Admin → Email Settings → Email templates. Never throws: a failed email must not break a form.
 */
import nodemailer from 'nodemailer';
import { isDemo } from './config';
import { getContent } from './cms/content';
import { table } from './store';
import { createAdminClient } from './supabase/server';

export type EmailSettings = { enabled: boolean; host: string; port: number; secure: boolean; user: string; pass: string; fromName: string; fromEmail: string; adminEmail: string; notifyAdmin: boolean; confirmToUser: boolean };
type Template = { key: string; subject: string; body: string; enabled: boolean };

const fill = (s: string, vars: Record<string, string | number | null | undefined>) =>
  s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] === undefined || vars[k] === null ? '' : String(vars[k])));

async function template(key: string): Promise<Template | null> {
  if (isDemo) return table<Template>('email_templates').find((t) => t.key === key) ?? null;
  try {
    const { data } = await createAdminClient().from('email_templates').select('*').eq('key', key).maybeSingle();
    return (data as Template) ?? null;
  } catch { return null; }
}

export async function emailSettings() {
  return getContent<EmailSettings>('settings.email');
}

function transport(s: EmailSettings) {
  return nodemailer.createTransport({
    host: s.host, port: Number(s.port) || 587, secure: !!s.secure,
    auth: s.user ? { user: s.user, pass: s.pass } : undefined,
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 10000,
  });
}

/** Sends one email. Returns an error message, or null when sent. */
export async function sendRaw(to: string, subject: string, text: string, s?: EmailSettings): Promise<string | null> {
  const cfg = s ?? (await emailSettings());
  if (!cfg.enabled) return 'Email sending is switched off in Email Settings.';
  if (!cfg.host || !cfg.fromEmail) return 'Add the SMTP host and From email in Email Settings.';
  try {
    await transport(cfg).sendMail({ from: `"${cfg.fromName || 'Syllabdosth'}" <${cfg.fromEmail}>`, to, subject, text });
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Could not send email';
  }
}

/** Sends a template email; silently skips when email is off or the template is disabled. */
export async function sendTemplate(key: string, to: string | null | undefined, vars: Record<string, string | number | null | undefined>) {
  try {
    if (!to) return;
    const s = await emailSettings();
    if (!s.enabled || !s.host) return;
    const t = await template(key);
    if (!t || !t.enabled) return;
    await sendRaw(to, fill(t.subject, vars), fill(t.body, vars), s);
  } catch { /* never break the caller */ }
}

/** Website events → emails to the person who submitted and to the admin. */
export async function notifyEnquiry(kind: 'Course enquiry' | 'Group enquiry' | 'Application' | 'Booking' | 'Contact message', vars: Record<string, string | number | null | undefined>, userTemplate?: string, userEmail?: string | null) {
  try {
    const s = await emailSettings();
    if (!s.enabled || !s.host) return;
    const jobs: Promise<unknown>[] = [];
    if (s.notifyAdmin && s.adminEmail) jobs.push(sendTemplate('admin_new_enquiry', s.adminEmail, { ...vars, type: kind.toLowerCase() }));
    if (s.confirmToUser && userTemplate && userEmail) jobs.push(sendTemplate(userTemplate, userEmail, vars));
    await Promise.all(jobs);
  } catch { /* ignore */ }
}
