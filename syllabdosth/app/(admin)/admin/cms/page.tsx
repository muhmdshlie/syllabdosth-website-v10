import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/admin/icons';
import { PageHeader } from '@/components/admin/ui';
import { getSavedContent } from '@/lib/cms/content';
import { CONTENT_DEFS, slugFromContentKey } from '@/lib/cms/schema';

export const metadata: Metadata = { title: 'CMS' };

const MORE = [
  { href: '/admin/courses', title: 'Courses', text: 'Titles, fees, cover photos, curriculum.' },
  { href: '/admin/categories', title: 'Course categories', text: 'Category names and photos.' },
  { href: '/admin/services', title: 'Services', text: 'Service names, prices and photos.' },
  { href: '/admin/instructors', title: 'Faculty', text: 'Faculty names, bios and photos.' },
  { href: '/admin/testimonials', title: 'Testimonials', text: 'Success stories on the home page.' },
  { href: '/admin/faqs', title: 'FAQs', text: 'Questions on the home and Help pages.' },
  { href: '/admin/blog', title: 'Blog posts', text: 'Articles and their cover images.' },
  { href: '/admin/settings/branding', title: 'Logo & favicon', text: 'Logos for light and dark backgrounds.' },
];

export default async function CmsIndex() {
  const pages = CONTENT_DEFS.filter((d) => d.kind === 'page');
  const saved = await Promise.all(pages.map((p) => getSavedContent(p.key)));
  return (
    <>
      <PageHeader title="CMS: website content" crumbs={[{ label: 'CMS' }]} sub="Every text and image on the website can be changed here. Pick a page to edit." />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {pages.map((p, i) => (
          <Link key={p.key} href={`/admin/cms/${slugFromContentKey(p.key)}`} className="adm-card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-adm-green">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-adm-green-soft text-adm-green"><Icon name="cms" /></span>
              <h2 className="text-[17px] font-semibold group-hover:text-adm-green">{p.title}</h2>
              <span className={`adm-badge ml-auto ${saved[i] ? 'bg-adm-green-soft text-[#16784f]' : 'bg-[#EEF1F4] text-adm-muted'}`}>{saved[i] ? 'Edited' : 'Original'}</span>
            </div>
            <p className="mt-3 text-[14px] text-adm-muted">{p.description ?? `${p.fields.length} sections`}</p>
            <span className="mt-4 text-[14px] font-medium text-adm-green">Edit →</span>
          </Link>
        ))}
      </div>
      <h2 className="mb-4 mt-10 text-[18px] font-semibold">Other website content</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {MORE.map((m) => (
          <Link key={m.href} href={m.href} className="adm-card p-4 transition hover:border-adm-green">
            <p className="font-medium">{m.title}</p>
            <p className="mt-1 text-[13px] text-adm-muted">{m.text}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
