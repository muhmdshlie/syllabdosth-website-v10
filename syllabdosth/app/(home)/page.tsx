import Link from 'next/link';
import type React from 'react';
import { subscribeAction } from '@/app/actions';
import { BlogCard, CourseCard, FacultyCard, ServiceCard } from '@/components/cards';
import { CraftStory } from '@/components/craft-story';
import { ActionForm, SubmitButton } from '@/components/forms';
import { HeroReveal } from '@/components/hero-reveal';
import { Manifesto } from '@/components/manifesto';
import { Photo } from '@/components/motion';
import { Avatar, Section, SectionHeader } from '@/components/ui';
import type { HeroCopy } from '@/components/hero-reveal';
import { getContent } from '@/lib/cms/content';
import { CONTENT, DEFAULT_HERO_PHOTO, imageFallback } from '@/lib/cms/schema';
import { featuredCourses, listBlog, listCategories, listFaculty, listServices } from '@/lib/data';
import { heroPhotos, type StoryScene } from '@/lib/images';
import { listFaqs, listTestimonials } from '@/lib/lms';

type Head = { eyebrow: string; title: string; sub?: string };
type Img = { image: string; alt?: string };
type Home = {
  hero: HeroCopy & Img & { depth: string };
  stats: { value: string; label: string }[];
  manifesto: { text: string; footnotes: string[] };
  story: { word: string; eyebrow: string; line: string; image: string; alt: string; callouts: { image: string; title: string; text: string }[] }[];
  courses: Head; services: Head; faculty: Head; faq: Head; blog: Head;
  groupBanner: { eyebrow: string; title: string; cta: string };
  gallery: Head & { items: { label: string; image: string }[]; cardEyebrow: string; cardTitle1: string; cardTitle2: string };
  testimonials: { eyebrow: string; title: string; note: string };
  closing: { eyebrow: string; title1: string; title2: string; text: string; primaryCta: string; secondaryCta: string };
  newsletter: { title: string; text: string };
};

export default async function HomePage() {
  const [c, courses, categories, services, faculty, posts, faqs, testimonials] = await Promise.all([
    getContent<Home>('page.home'), featuredCourses(), listCategories(), listServices(), listFaculty(), listBlog(), listFaqs(), listTestimonials(),
  ]);
  const cat = (slug: string) => categories.find((x) => x.slug === slug);
  const d = CONTENT['page.home'].defaults as unknown as Home;
  // Hero photo from the CMS; the 3D depth map only fits the original photo.
  const heroSrc = imageFallback(c.hero.image, DEFAULT_HERO_PHOTO);
  const hero = { src: heroSrc, alt: c.hero.alt ?? '', depth: heroSrc === DEFAULT_HERO_PHOTO || c.hero.depth !== d.hero.depth ? c.hero.depth || undefined : undefined, focus: heroPhotos.main.focus };
  const scenes: StoryScene[] = c.story.map((s, i) => ({
    word: s.word, eyebrow: s.eyebrow, line: s.line,
    center: { src: imageFallback(s.image, d.story[i]?.image ?? heroSrc), alt: s.alt },
    callouts: s.callouts.map((x, j) => ({ img: imageFallback(x.image, d.story[i]?.callouts[j]?.image ?? heroSrc), title: x.title, text: x.text })),
  }));
  const gallery = c.gallery.items.filter((g) => g.image);
  const notes = c.manifesto.footnotes.length >= 2 ? [c.manifesto.footnotes[0], c.manifesto.footnotes[1]] as [string, string] : undefined;

  return (
    <>
      {/* 1 · Hero — framed photo opens to full-bleed as you scroll */}
      <HeroReveal photo={hero} stats={c.stats} copy={c.hero} />

      {/* 2 · Manifesto — words light up as you scroll */}
      <Manifesto text={c.manifesto.text} footnotes={notes} />

      {/* 3 · Split-screen story — Learn → Create → Master → Earn */}
      {scenes.length > 0 && <CraftStory scenes={scenes} />}

      {/* 4 · Courses */}
      <Section tone="cream">
        <SectionHeader eyebrow={c.courses.eyebrow} title={c.courses.title} sub={c.courses.sub} action={<Link href="/courses" className="btn-secondary">View all courses</Link>} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {courses.map((co, i) => (
            <div key={co.id} data-reveal style={{ '--d': `${(i % 4) * 0.08}s` } as React.CSSProperties}>
              <CourseCard course={co} category={cat(co.category_slug)} />
            </div>
          ))}
        </div>
      </Section>

      {/* 5 · Services */}
      <Section>
        <SectionHeader eyebrow={c.services.eyebrow} title={c.services.title} sub={c.services.sub} action={<Link href="/services" className="btn-secondary">See all services</Link>} />
        <div className="grid gap-5 md:grid-cols-3">
          {services.slice(0, 3).map((s, i) => (
            <div key={s.id} data-reveal style={{ '--d': `${i * 0.1}s` } as React.CSSProperties}>
              <ServiceCard service={s} />
            </div>
          ))}
        </div>
        <div data-reveal className="bg-noir mt-6 flex flex-col items-start justify-between gap-6 rounded-card p-8 text-pearl md:flex-row md:items-center sm:p-10">
          <div>
            <p className="eyebrow text-ink-dark-muted">{c.groupBanner.eyebrow}</p>
            <h3 className="mt-3 font-display text-[26px] font-medium uppercase tracking-[-0.02em] sm:text-[32px]">{c.groupBanner.title}</h3>
          </div>
          <Link href="/group-booking" className="btn-primary shrink-0">{c.groupBanner.cta}</Link>
        </div>
      </Section>

      {/* 6 · Gallery */}
      <Section tone="cream">
        <SectionHeader eyebrow={c.gallery.eyebrow} title={c.gallery.title} sub={c.gallery.sub} />
        <div className="grid grid-flow-dense auto-rows-[190px] grid-cols-2 gap-3 sm:auto-rows-[240px] md:grid-cols-3 md:gap-4">
          {gallery.map((g, i) => (
            <figure
              key={i}
              data-reveal="mask"
              style={{ '--d': `${(i % 3) * 0.1}s` } as React.CSSProperties}
              className={`group relative overflow-hidden rounded-card ${i === 0 || i === 4 ? 'row-span-2' : ''}`}
            >
              <Photo src={g.image} alt={g.label} className="zoom-img h-full w-full" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-noir/70 via-transparent to-transparent" />
              <figcaption className="absolute inset-x-4 bottom-4 flex items-end justify-between text-pearl">
                <span className="font-display text-[13px] font-medium uppercase tracking-[0.14em]">{g.label}</span>
                <span aria-hidden className="micro opacity-0 transition duration-500 group-hover:opacity-100">View →</span>
              </figcaption>
            </figure>
          ))}
          <Link href="/services" data-reveal="zoom" className="liquid-glass-light group relative col-span-2 flex flex-col justify-end rounded-card p-6 md:col-span-1">
            <p className="eyebrow text-ink-soft">{c.gallery.cardEyebrow}</p>
            <p className="mt-3 font-display text-[24px] font-medium uppercase leading-[0.95] tracking-[-0.02em]">{c.gallery.cardTitle1}<br /><span className="accent">{c.gallery.cardTitle2}</span></p>
            <span className="micro mt-5 inline-flex items-center gap-2">See all services <span aria-hidden className="transition group-hover:translate-x-1">→</span></span>
          </Link>
        </div>
      </Section>

      {/* 7 · Faculty */}
      <Section tone="dark">
        <SectionHeader dark eyebrow={c.faculty.eyebrow} title={c.faculty.title} sub={c.faculty.sub} />
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">
          {faculty.slice(0, 6).map((f, i) => (
            <div key={f.id} data-reveal style={{ '--d': `${(i % 3) * 0.08}s` } as React.CSSProperties}><FacultyCard f={f} dark /></div>
          ))}
        </div>
      </Section>

      {/* 8 · Testimonials */}
      <Section>
        <SectionHeader eyebrow={c.testimonials.eyebrow} title={c.testimonials.title} />
        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((t, k) => (
            <figure key={t.id} data-reveal style={{ '--d': `${(k % 3) * 0.1}s` } as React.CSSProperties} className="liquid-glass-light flex h-full flex-col rounded-card p-7 sm:p-8">
              <p className="micro text-ink-soft" aria-label={`${t.rating} out of 5 stars`}>{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)} · {t.rating.toFixed(1)}</p>
              <blockquote className="mt-5 font-serif text-[22px] italic leading-snug text-noir">“{t.quote}”</blockquote>
              <figcaption className="mt-auto flex items-center gap-3 border-t border-noir/10 pt-5">
                <Avatar text={t.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()} src={t.photo_url ?? undefined} size={44} />
                <span>
                  <span className="block font-display text-[13px] font-medium uppercase tracking-[0.1em]">{t.name}</span>
                  <span className="text-[13px] text-ink-soft">{t.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
        {c.testimonials.note && <p className="micro mt-5 text-ink-soft">{c.testimonials.note}</p>}
      </Section>

      {/* 9 · FAQ */}
      <Section tone="cream">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="self-start lg:sticky lg:top-28">
            <SectionHeader eyebrow={c.faq.eyebrow} title={c.faq.title} sub={c.faq.sub} />
            <Link href="/help" className="btn-secondary -mt-4">All help topics</Link>
          </div>
          <div data-reveal className="liquid-glass-light divide-y divide-noir/10 rounded-card px-6 sm:px-8">
            {faqs.map((f) => (
              <details key={f.id} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[15px] font-medium uppercase tracking-[0.04em]">
                  {f.question}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-noir/20 text-lg transition duration-300 group-open:rotate-45 group-open:bg-noir group-open:text-pearl" aria-hidden>+</span>
                </summary>
                <p className="mt-3 max-w-xl whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </Section>

      {/* 10 · Blog */}
      <Section>
        <SectionHeader eyebrow={c.blog.eyebrow} title={c.blog.title} action={<Link href="/blog" className="btn-secondary">Read the journal</Link>} />
        <div className="grid gap-5 md:grid-cols-3">
          {posts.slice(0, 3).map((p, i) => (
            <div key={p.slug} data-reveal style={{ '--d': `${i * 0.1}s` } as React.CSSProperties}><BlogCard post={p} /></div>
          ))}
        </div>
      </Section>

      {/* 11 · Closing CTA + newsletter */}
      <section className="bg-noir py-24 text-pearl sm:py-32">
        <div className="container-page">
          <div data-reveal className="grid items-end gap-10 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="eyebrow text-ink-dark-muted">{c.closing.eyebrow}</p>
              <h2 className="h-display mt-5 text-[44px] sm:text-[72px] lg:text-[96px]">{c.closing.title1}<br /><span className="accent text-pearl/85">{c.closing.title2}</span></h2>
            </div>
            <div>
              <p className="body-l text-ink-dark-muted">{c.closing.text}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/apply/faculty" className="btn-primary">{c.closing.primaryCta}</Link>
                <Link href="/apply/professional" className="btn-ghost-dark">{c.closing.secondaryCta}</Link>
              </div>
            </div>
          </div>
          <div data-reveal className="liquid-glass mt-16 grid items-center gap-6 rounded-card p-7 sm:p-10 lg:grid-cols-2">
            <div>
              <p className="font-display text-[20px] font-medium uppercase tracking-[-0.01em]">{c.newsletter.title}</p>
              <p className="mt-2 text-[14px] text-ink-dark-muted">{c.newsletter.text}</p>
            </div>
            <ActionForm action={subscribeAction} className="w-full">
              <div className="flex flex-col gap-3 sm:flex-row">
                <label htmlFor="nl-email" className="sr-only">Email address</label>
                <input id="nl-email" name="email" type="email" required placeholder="you@example.com" className="input flex-1 !border-white/20 !bg-white/10 !text-pearl placeholder:!text-pearl/50" />
                <SubmitButton pendingText="Subscribing…">Subscribe</SubmitButton>
              </div>
            </ActionForm>
          </div>
        </div>
      </section>
    </>
  );
}
