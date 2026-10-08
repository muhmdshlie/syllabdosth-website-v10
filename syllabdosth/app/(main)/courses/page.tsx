import type { Metadata } from 'next';
import Link from 'next/link';
import { CourseCard } from '@/components/cards';
import { Empty, PageHeader, Section } from '@/components/ui';
import { listCategories, listCourses, type CourseFilter } from '@/lib/data';
import { Photo } from '@/components/motion';
import { categoryPhoto } from '@/lib/images';
import { getContent } from '@/lib/cms/content';

export const metadata: Metadata = { title: 'Courses', description: 'Certified courses in tailoring, beautician, nail art, mehandi, embroidery and saree draping.' };

const levels = ['Basic', 'Foundation', 'Certification', 'Master', 'Advanced', 'Pro Master'];
const durations = [['', 'Any length'], ['1-3', 'Up to 3 days'], ['4-14', '4–14 days'], ['15-45', '15–45 days'], ['46-90', '46–90 days'], ['91-', '3 months +']];
const prices = [['', 'Any price'], ['0-2999', 'Under ₹3,000'], ['3000-9999', '₹3,000 – ₹9,999'], ['10000-29999', '₹10,000 – ₹29,999'], ['30000-', '₹30,000 +']];
const sorts = [['', 'Recommended'], ['popular', 'Most popular'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low']];

export default async function CoursesPage({ searchParams }: { searchParams: CourseFilter }) {
  const [categories, courses, pages] = await Promise.all([listCategories(), listCourses(searchParams), getContent<{ courses: { title: string; sub: string } }>('page.listings')]);
  const active = categories.find((c) => c.slug === searchParams.category);
  const qs = (patch: Partial<CourseFilter>) => {
    const p = new URLSearchParams(Object.entries({ ...searchParams, ...patch }).filter(([, v]) => v) as [string, string][]);
    const s = p.toString();
    return s ? `/courses?${s}` : '/courses';
  };

  return (
    <>
      <Section className="!pb-10">
        <PageHeader
          crumbs={[{ href: '/', label: 'Home' }, { label: 'Courses' }]}
          title={active ? `${active.name} courses` : pages.courses.title}
          sub={active?.description || pages.courses.sub}
          underline
        />
        <div className="flex flex-wrap gap-2" role="list" aria-label="Categories">
          <Link role="listitem" href={qs({ category: undefined })} className={`rounded-full px-5 py-2.5 text-[14px] font-semibold ${!active ? 'bg-noir text-white shadow-md' : 'bg-white text-ink hover:-translate-y-0.5 hover:bg-taupe-light'}`}>All courses</Link>
          {categories.map((c) => (
            <Link role="listitem" key={c.slug} href={qs({ category: c.slug })} className={`rounded-full py-2 pl-2 pr-5 text-[14px] font-semibold transition ${active?.slug === c.slug ? 'bg-noir text-white shadow-md' : 'bg-white text-ink hover:-translate-y-0.5 hover:bg-taupe-light'}`}><span className="inline-flex items-center gap-2"><Photo src={categoryPhoto(c.slug, 120, c.image_url)} className="h-6 w-6 rounded-full ring-2 ring-white" />{c.name}</span></Link>
          ))}
        </div>
      </Section>

      <section className="bg-paper pb-24">
        <div className="container-page grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside>
            <form method="get" action="/courses" className="card sticky top-6 space-y-5 !p-6" aria-label="Filter courses">
              {searchParams.category && <input type="hidden" name="category" value={searchParams.category} />}
              <div>
                <label htmlFor="q" className="label">Search</label>
                <input id="q" name="q" defaultValue={searchParams.q} placeholder="e.g. blouse, bridal" className="input" />
              </div>
              <Select name="level" label="Level" value={searchParams.level} options={[['', 'Any level'], ...levels.map((l) => [l, l])]} />
              <Select name="duration" label="Duration" value={searchParams.duration} options={durations} />
              <Select name="price" label="Price" value={searchParams.price} options={prices} />
              <Select name="sort" label="Sort by" value={searchParams.sort} options={sorts} />
              <button className="btn-dark w-full" type="submit">Apply filters</button>
              <Link href="/courses" className="block text-center text-[14px] font-semibold underline">Reset filters</Link>
            </form>
          </aside>
          <div>
            <p className="mb-5 text-[14px] font-semibold text-ink-deep" aria-live="polite">{courses.length} {courses.length === 1 ? 'course' : 'courses'}</p>
            {courses.length ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {courses.map((c, i) => <div key={c.id} data-reveal style={{ "--d": `${(i % 3) * 0.08}s` } as React.CSSProperties}><CourseCard course={c} category={categories.find((x) => x.slug === c.category_slug)} /></div>)}
              </div>
            ) : (
              <Empty title="No courses match these filters" text="Try a different level or price range." action={<Link href="/courses" className="btn-primary">Reset filters</Link>} />
            )}
            <div className="mt-12 flex flex-col items-start justify-between gap-6 rounded-card bg-cream p-8 md:flex-row md:items-center">
              <div>
                <h2 className="h3">Training a team or a college batch?</h2>
                <p className="mt-2 text-ink-soft">Book a certified faculty member for a one-day workshop — bridal parties, office wellness days, or college fests.</p>
              </div>
              <Link href="/group-booking" className="btn-primary">Enquire for a group</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Select({ name, label, value, options }: { name: string; label: string; value?: string; options: string[][] }) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <select id={name} name={name} defaultValue={value ?? ''} className="input">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
