import Link from 'next/link';
import { durationLabel, inr } from '@/lib/format';
import { blogPhoto, coursePhoto, facultyPhoto, servicePhoto } from '@/lib/images';
import type { CoursePromo } from '@/lib/offers';
import { Photo } from './motion';
import type { BlogPost, Category, Course, Faculty, Service } from '@/lib/types';
import { Avatar } from './ui';

export function CourseImage({ course, className = 'h-40', eager, categoryImage }: { course: Course; tone?: string; className?: string; eager?: boolean; categoryImage?: string | null }) {
  return <Photo src={coursePhoto(course, 900, categoryImage)} alt={course.title} className={`zoom-img w-full rounded-2xl ${className}`} eager={eager} />;
}

export function CourseCard({ course, category, promo }: { course: Course; category?: Category; promo?: CoursePromo | null }) {
  return (
    <Link href={`/courses/${course.slug}`} className="liquid-glass-light group flex h-full flex-col rounded-card p-3">
      <div className="relative">
        <CourseImage course={course} className="h-44" categoryImage={category?.image_url} />
        <div className="absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
          {promo && <PromoBadge promo={promo} />}
          {course.featured && <span className="liquid-glass micro ml-auto rounded-[3px] px-2.5 py-1.5 text-white">Popular</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-4">
        <p className="eyebrow text-[11px] text-taupe-deep">{category?.name ?? course.category_slug}</p>
        <h3 className="mt-2 font-display text-[16px] font-medium leading-snug tracking-[-0.01em] text-ink">{course.title}</h3>
        <p className="mt-2 text-[13px] text-ink-soft">{course.level} · {durationLabel(course.duration_days)} · {course.mode}</p>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4">
          {promo ? (
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[15px] font-semibold text-deal">-{promo.percent}%</span>
                <span className="whitespace-nowrap text-[18px] font-bold">{inr(promo.price)}</span>
              </p>
              <p className="mt-0.5 text-[12px] text-ink-soft">
                M.R.P. <s aria-label={`was ${inr(promo.original)}`}>{inr(promo.original)}</s> · Save {inr(promo.saved)}
              </p>
            </div>
          ) : (
            <span className="whitespace-nowrap text-[16px] font-bold">{inr(course.price)}</span>
          )}
          <span className="btn-secondary btn-sm">Details <span aria-hidden className="transition group-hover:translate-x-0.5">→</span></span>
        </div>
      </div>
    </Link>
  );
}

/** "DIWALI SPECIAL OFFER" style label; falls back to a plain deal label when the admin left the badge empty. */
export function PromoBadge({ promo, className = '' }: { promo: CoursePromo; className?: string }) {
  return <span className={`micro inline-flex rounded-[3px] bg-deal px-2.5 py-1.5 text-white shadow-sm ${className}`}>{promo.badge || 'Limited-time deal'}</span>;
}

/** Big price block for the course page and enrolment summary. */
export function PromoPrice({ promo, size = 'lg' }: { promo: CoursePromo; size?: 'lg' | 'sm' }) {
  return (
    <div data-testid="promo-price">
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className={`font-semibold text-deal ${size === 'lg' ? 'text-[26px]' : 'text-[15px]'}`}>-{promo.percent}%</span>
        <span className={`font-serif font-bold leading-none ${size === 'lg' ? 'text-[36px]' : 'text-[15px]'}`}>{inr(promo.price)}</span>
      </p>
      <p className={`mt-1.5 text-ink-soft ${size === 'lg' ? 'text-[13px]' : 'text-[12px]'}`}>
        M.R.P. <s aria-label={`was ${inr(promo.original)}`}>{inr(promo.original)}</s>
      </p>
      <p className={`mt-1 font-semibold text-deal ${size === 'lg' ? 'text-[14px]' : 'text-[12px]'}`}>You save {inr(promo.saved)} ({promo.percent}%)</p>
    </div>
  );
}

export function ServiceCard({ service }: { service: Service }) {
  return (
    <div className="liquid-glass-light group flex h-full flex-col overflow-hidden rounded-card">
      <div className="relative">
        <Photo src={servicePhoto(service.slug, 800, service.image_url)} alt={service.title} className="zoom-img h-52 w-full" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-noir-deep/55 via-transparent to-noir-deep/20" aria-hidden />
        <span className="liquid-glass micro absolute left-4 top-4 rounded-[3px] px-2.5 py-1.5 text-white">{service.category}</span>
      </div>
      <div className="flex flex-1 flex-col p-7 pt-5">
      <h3 className="font-display text-[19px] font-medium uppercase leading-tight tracking-[-0.01em]">
        <Link href={`/services/${service.slug}`} className="transition hover:text-noir">{service.title}</Link>
      </h3>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{service.summary}</p>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-5">
        <div>
          <p className="text-[12px] text-ink-soft">Starting from</p>
          <p className="whitespace-nowrap text-[16px] font-bold">{inr(service.price_from)}</p>
        </div>
        <Link href={`/services/${service.slug}`} className="btn-primary btn-sm">Book service</Link>
      </div>
      </div>
    </div>
  );
}

export function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="liquid-glass-light group flex h-full flex-col overflow-hidden rounded-card">
      <Photo src={blogPhoto(post.slug, 800, post.image_url)} alt={post.title} className="zoom-img h-48 w-full" />
      <div className="flex flex-1 flex-col p-6">
        <p className="eyebrow text-[11px] text-taupe-deep">{post.category}</p>
        <h3 className="mt-2 font-display text-[17px] font-medium leading-snug tracking-[-0.01em]">{post.title}</h3>
        <p className="mt-auto pt-4 text-[13px] text-ink-soft">{post.read_mins} min read · {post.author}</p>
      </div>
    </Link>
  );
}

export function FacultyCard({ f, dark }: { f: Faculty; dark?: boolean }) {
  const dp = facultyPhoto(f.initials, 480, f.photo_url);
  return (
    <div className={`group rounded-card p-4 ${dark ? 'liquid-glass' : 'liquid-glass-light'}`}>
      {dp ? (
        <Photo src={dp} alt={f.name} className="zoom-img arch aspect-[4/5] w-full" />
      ) : (
        <div className="arch flex aspect-[4/5] w-full items-center justify-center bg-noir-light"><Avatar text={f.initials} size={64} /></div>
      )}
      <div className="px-2 pb-2 pt-4">
        <p className={`font-serif text-[24px] font-medium leading-tight ${dark ? 'text-white' : ''}`}>{f.name}</p>
        <p className={`text-[13px] font-semibold uppercase tracking-[0.14em] ${dark ? 'text-pearl' : 'text-taupe-deep'}`}>{f.specialty}</p>
        <p className={`mt-1 text-[13px] ${dark ? 'text-ink-dark-muted' : 'text-ink-soft'}`}>{f.years} years · {f.students.toLocaleString('en-IN')}+ students</p>
      </div>
    </div>
  );
}
