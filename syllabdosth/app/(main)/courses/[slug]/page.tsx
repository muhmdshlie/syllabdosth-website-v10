import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CourseCard, CourseImage } from '@/components/cards';
import { Avatar, Breadcrumbs, Check, Section, Tag } from '@/components/ui';
import { getContent, getSiteSettings } from '@/lib/cms/content';
import { getCourse, getFaculty, listCategories, relatedCourses } from '@/lib/data';
import { durationLabel, inr } from '@/lib/format';
import { facultyPhoto } from '@/lib/images';
import { activeOffers, approvedReviews, lessonsForCourse } from '@/lib/lms';

type CoursePageText = { course: { feeNote: string; guarantee: string; moduleNote: string } };
const KIND: Record<string, string> = { video: 'Video', reading: 'Reading', live: 'Live', download: 'Download' };

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const c = await getCourse(params.slug);
  return c ? { title: c.title, description: c.summary } : {};
}

export default async function CoursePage({ params }: { params: { slug: string } }) {
  const course = await getCourse(params.slug);
  if (!course) notFound();
  const [categories, faculty, related, site, text, lessons, reviews, offers] = await Promise.all([
    listCategories(), getFaculty(course.faculty_id), relatedCourses(course), getSiteSettings(), getContent<CoursePageText>('page.listings'),
    lessonsForCourse(course.id), approvedReviews(course.id), activeOffers(course.id),
  ]);
  const t = text.course;
  const cat = categories.find((c) => c.slug === course.category_slug);

  return (
    <>
      <Section className="!pb-16">
        <Breadcrumbs items={[{ href: '/', label: 'Home' }, { href: '/courses', label: 'Courses' }, { href: `/courses?category=${course.category_slug}`, label: cat?.name ?? 'Category' }, { label: course.title }]} />
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <Tag className="!bg-noir !text-taupe-light">{cat?.name}</Tag>
            <h1 className="h1 mt-4">{course.title}</h1>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px] font-medium text-ink-deep">
              <li>★ {course.rating} ({course.ratings_count} ratings)</li>
              <li>{course.students.toLocaleString('en-IN')} students enrolled</li>
              <li>Level: {course.level}</li>
              <li>Duration: {durationLabel(course.duration_days)}</li>
              <li>Certificate included</li>
            </ul>
            <div className="mt-8 overflow-hidden liquid-glass-light rounded-card p-3 shadow-[0_24px_50px_-30px_rgba(123,30,58,0.5)]"><CourseImage course={course} className="h-64 sm:h-96" eager categoryImage={cat?.image_url} /></div>

            <div className="mt-12 space-y-12">
              <div>
                <h2 className="h3">About this course</h2>
                <p className="body-l mt-3 text-ink-deep">{course.description}</p>
              </div>
              <div>
                <h2 className="h3">What you&apos;ll learn</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {course.outcomes.map((o) => <li key={o} className="flex gap-2 text-[15px] text-ink"><span className="text-taupe-deep"><Check /></span>{o}</li>)}
                </ul>
              </div>
              <div>
                <h2 className="h3">Curriculum</h2>
                <div className="mt-4 divide-y divide-line overflow-hidden liquid-glass-light rounded-card">
                  {course.modules.map((m, i) => (
                    <details key={m.title} className="group px-6 py-5" open={i === 0}>
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                        <span>{m.title}</span>
                        <span className="whitespace-nowrap text-[13px] font-medium text-ink-soft">{durationLabel(m.days)}</span>
                      </summary>
                      <p className="mt-3 text-[14px] text-ink-soft">{t.moduleNote}</p>
                    </details>
                  ))}
                </div>
                {lessons.length > 0 && (
                  <div className="mt-6 overflow-hidden liquid-glass-light rounded-card">
                    <p className="border-b border-line px-6 py-4 font-display text-[13px] font-medium uppercase tracking-[0.14em]">Lessons · {lessons.length}</p>
                    <ol className="divide-y divide-line">
                      {lessons.map((l, i) => (
                        <li key={l.id} className="flex items-center justify-between gap-4 px-6 py-3.5 text-[14px]">
                          <span className="flex items-center gap-3"><span className="w-6 text-ink-soft">{i + 1}.</span>{l.title}</span>
                          <span className="flex shrink-0 items-center gap-3 text-[13px] text-ink-soft">
                            {l.free_preview && l.video_url ? <a href={l.video_url} target="_blank" rel="noreferrer" className="font-semibold text-ink underline">Free preview</a> : l.free_preview ? <span className="font-semibold text-ink">Free preview</span> : null}
                            {KIND[l.kind]}{l.duration_mins ? ` · ${l.duration_mins} min` : ''}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
              {faculty && (
                <div>
                  <h2 className="h3">Your instructor</h2>
                  <div className="mt-4 flex gap-4 liquid-glass-light rounded-card p-6">
                    <Avatar text={faculty.initials} size={56} src={facultyPhoto(faculty.initials, 160, faculty.photo_url)} />
                    <div>
                      <p className="font-serif text-[19px] font-bold">{faculty.name}</p>
                      <p className="text-[14px] text-ink-soft">{faculty.specialty} · {faculty.years} years experience · {faculty.students.toLocaleString('en-IN')}+ students trained</p>
                      <p className="mt-2 text-[15px]">{faculty.bio}</p>
                    </div>
                  </div>
                </div>
              )}
              {reviews.length > 0 && (
                <div>
                  <h2 className="h3">What learners say</h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {reviews.slice(0, 6).map((r) => (
                      <figure key={r.id} className="liquid-glass-light rounded-card p-5">
                        <p className="text-[13px]" aria-label={`${r.rating} out of 5`}>{'★'.repeat(r.rating)}<span className="text-ink-soft">{'★'.repeat(5 - r.rating)}</span></p>
                        <blockquote className="mt-2 text-[15px]">{r.comment}</blockquote>
                        <figcaption className="mt-3 text-[13px] font-semibold">{r.name}</figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="lg:pt-10">
            <div className="card sticky top-6 !p-7">
              <p className="text-[13px] text-ink-soft">Course fee</p>
              <p className="mt-1 font-serif text-[36px] font-bold leading-none">{inr(course.price)}</p>
              <p className="mt-2 text-[13px] text-ink-soft">{t.feeNote}</p>
              {offers.map((o) => (
                <div key={o.id} className="mt-4 rounded-[4px] border border-dashed border-noir/30 bg-white/70 px-4 py-3" data-testid="course-offer">
                  <p className="text-[13px] font-semibold">{o.discount_text}</p>
                  {o.code && <p className="mt-1 text-[12px] text-ink-soft">Code <span className="font-mono font-semibold text-ink">{o.code}</span>{o.valid_until ? ` · till ${new Date(o.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}</p>}
                  {o.description && <p className="mt-1 text-[12px] text-ink-soft">{o.description}</p>}
                </div>
              ))}
              <Link href={`/courses/${course.slug}/enroll`} className="btn-primary mt-6 w-full">Enroll now</Link>
              {site.whatsappUrl && <a href={`${site.whatsappUrl}?text=${encodeURIComponent(`Hi, I have a question about ${course.title}`)}`} target="_blank" rel="noreferrer" className="btn-secondary mt-3 w-full">Ask on WhatsApp</a>}
              <dl className="mt-6 divide-y divide-line text-[14px]">
                {[['Duration', durationLabel(course.duration_days)], ['Level', course.level], ['Mode', course.mode], ['Language', course.language], ['Certificate', 'Yes'], ['Access', 'Mobile & desktop']].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-3"><dt className="text-ink-soft">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
                ))}
              </dl>
              {t.guarantee && <p className="mt-4 text-[12px] text-ink-soft">{t.guarantee}</p>}
            </div>
          </aside>
        </div>
      </Section>

      {related.length > 0 && (
        <Section tone="cream">
          <h2 className="h2 mb-8">Related courses</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((c) => <CourseCard key={c.id} course={c} category={cat} />)}
          </div>
        </Section>
      )}
    </>
  );
}
