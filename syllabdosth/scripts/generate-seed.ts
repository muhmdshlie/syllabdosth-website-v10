/** Regenerates supabase/seed.sql from lib/demo-data.ts.  Run: npx tsx scripts/generate-seed.ts */
import { writeFileSync } from 'node:fs';
import { blogPosts, categories, courses, faculty, professionals, services } from '../lib/demo-data';

const q = (v: unknown): string => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return `array[${v.map(q).join(',')}]::text[]`;
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};
const insert = (table: string, rows: Record<string, unknown>[]) => {
  const cols = Object.keys(rows[0]);
  return `insert into public.${table} (${cols.join(', ')}) values\n${rows.map((r) => `  (${cols.map((c) => q(r[c])).join(', ')})`).join(',\n')}\non conflict do nothing;\n`;
};

const sql = [
  '-- Sample catalogue. Generated from lib/demo-data.ts — edit there and re-run scripts/generate-seed.ts.',
  insert('categories', categories.map((c, i) => ({ ...c, sort: i }))),
  insert('faculty', faculty.map(({ user_id, ...f }) => f)),
  insert('courses', courses.map(({ image_url, ...c }) => c)),
  insert('services', services.map((s, i) => ({ ...s, sort: i }))),
  insert('professionals', professionals.map(({ user_id, ...p }) => p)),
  insert('blog_posts', blogPosts),
  `-- After you sign up with your own account, make yourself admin:
-- update public.profiles set role = 'admin' where email = 'you@example.com';
-- Link a professional or faculty listing to a user account:
-- update public.professionals set user_id = (select id from public.profiles where email = 'ananya@example.com') where slug = 'ananya-makeup-studio';
`,
].join('\n');
writeFileSync(new URL('../supabase/seed.sql', import.meta.url), sql);
console.log('seed.sql written:', sql.length, 'chars');
