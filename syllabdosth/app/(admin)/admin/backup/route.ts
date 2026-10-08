import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { withoutSecrets } from '@/lib/cms/content';
import { isDemo } from '@/lib/config';
import { table } from '@/lib/store';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TABLES = ['categories', 'courses', 'course_lessons', 'course_reviews', 'certificates', 'quizzes', 'assignments', 'live_classes', 'faculty', 'services', 'professionals',
  'blog_posts', 'faqs', 'testimonials', 'offers', 'organisations', 'staff', 'notifications', 'site_content', 'media', 'email_templates', 'sms_templates'];

/** JSON backup of the website's content (not people's private data). Passwords and API keys are left out. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== 'admin') return new NextResponse('Not allowed', { status: 403 });
  const out: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    let rows: Record<string, unknown>[] = [];
    if (isDemo) rows = table(t);
    else {
      const { data } = await createAdminClient().from(t).select('*').limit(10000);
      rows = (data ?? []) as Record<string, unknown>[];
    }
    out[t] = t === 'site_content' ? rows.map((r) => ({ ...r, value: withoutSecrets(String(r.key), r.value as Record<string, unknown>).value })) : rows;
  }
  const body = JSON.stringify({ exported_at: new Date().toISOString(), site: 'syllabdosth', tables: out }, null, 2);
  return new NextResponse(body, { headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="syllabdosth-backup-${new Date().toISOString().slice(0, 10)}.json"`, 'Cache-Control': 'no-store' } });
}
