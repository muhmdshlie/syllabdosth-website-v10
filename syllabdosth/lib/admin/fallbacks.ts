import 'server-only';
import { listCategories } from '../data';
import { blogPhoto, categoryPhoto, coursePhoto, facultyPhoto, servicePhoto } from '../images';
import type { Resource, Row } from './types';

/** The photo the website shows when a record has no image of its own (so admins see what's live). */
export async function imageFallbacks(r: Resource, rows: Row[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const cats = r.key === 'courses' ? await listCategories() : [];
  for (const row of rows) {
    const id = String(row[r.pk]);
    const slug = String(row.slug ?? '');
    let url: string | undefined;
    if (r.key === 'courses') url = coursePhoto({ slug, category_slug: String(row.category_slug ?? ''), image_url: null }, 400, cats.find((c) => c.slug === row.category_slug)?.image_url);
    else if (r.key === 'categories') url = categoryPhoto(slug, 400);
    else if (r.key === 'services') url = servicePhoto(slug, 400);
    else if (r.key === 'blog') url = blogPhoto(slug, 400);
    else if (r.key === 'instructors') url = facultyPhoto(String(row.initials ?? ''), 200);
    if (url) out[id] = url;
  }
  return out;
}
