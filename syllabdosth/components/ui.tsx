import clsx from 'clsx';
import Link from 'next/link';
import type React from 'react';
import type { ReactNode } from 'react';
import { statusTone } from '@/lib/format';
import type { ApplicationStatus, BookingStatus, EnquiryStatus } from '@/lib/types';

export function Section({ tone = 'paper', className, children, id }: { tone?: 'paper' | 'cream' | 'dark' | 'white' | 'none'; className?: string; children: ReactNode; id?: string }) {
  const bg = { paper: 'paper-bg', cream: 'paper-bg-alt', dark: 'bg-noir text-white', white: 'bg-white', none: '' }[tone];
  return (
    <section id={id} className={clsx(bg, 'py-16 sm:py-24', className)}>
      <div className="container-page">{children}</div>
    </section>
  );
}

export function SectionHeader({ eyebrow, title, sub, action, dark }: { eyebrow?: string; title: string; sub?: string; action?: ReactNode; dark?: boolean }) {
  return (
    <div data-reveal className="mb-10 flex flex-col gap-6 sm:mb-12 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className={clsx('eyebrow mb-3 inline-flex items-center gap-2', dark ? 'text-taupe' : 'text-taupe-deep')}><span aria-hidden className="h-[2px] w-6 rounded-full bg-current" />{eyebrow}</p>}
        <h2 className={clsx('h1', dark ? 'text-white' : 'text-ink')} aria-label={title}>
          {title.split(' ').map((w, i) => (
            <span key={i} aria-hidden className="rw"><span style={{ '--i': i } as React.CSSProperties}>{w}</span>{'\u00a0'}</span>
          ))}
        </h2>
        {sub && <p className={clsx('body-l mt-3', dark ? 'text-ink-dark-muted' : 'text-ink-deep-muted')}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ crumbs, title, sub, underline }: { crumbs?: { href?: string; label: string }[]; title: string; sub?: string; underline?: boolean }) {
  return (
    <div className="mb-10">
      {crumbs && <Breadcrumbs items={crumbs} />}
      <h1 className="h-display anim-fade-up mt-4 max-w-5xl !text-[44px] text-ink sm:!text-[68px] lg:!text-[88px]">{title}</h1>
      {underline && <div className="anim-draw mt-6 h-px w-full max-w-[520px] bg-noir" aria-hidden />}
      {sub && <p className="body-l anim-fade-up delay-1 mt-5 max-w-3xl text-ink-deep-muted">{sub}</p>}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] font-semibold text-ink-deep">
      {items.map((c, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-2 opacity-60">/</span>}
          {c.href ? <Link className="hover:underline" href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx('inline-flex items-center whitespace-nowrap rounded-full bg-muted px-3 py-1 text-[12px] font-medium text-ink', className)}>{children}</span>;
}

export function Initials({ text, size = 56, className }: { text: string; size?: number; className?: string }) {
  return (
    <span
      className={clsx('inline-flex shrink-0 items-center justify-center rounded-2xl bg-noir font-semibold text-pearl', className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.3) }}
      aria-hidden
    >
      {text}
    </span>
  );
}

export function Avatar({ text, size = 44, dark, src }: { text: string; size?: number; dark?: boolean; src?: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className="shrink-0 rounded-full object-cover ring-2 ring-white/80 shadow-md"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={clsx('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', dark ? 'bg-noir text-pearl' : 'bg-pearl text-noir')}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}
      aria-hidden
    >
      {text}
    </span>
  );
}

export function StatusPill({ status, label }: { status: BookingStatus | EnquiryStatus | ApplicationStatus; label?: string }) {
  return <span className={clsx('inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-semibold capitalize', statusTone(status))}>{label ?? status}</span>;
}

export function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl bg-muted px-5 py-4">
      <p className="text-[12px] font-medium text-ink-soft">{label}</p>
      <p className="mt-1 text-[15px] font-semibold text-ink">{value}</p>
    </div>
  );
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="rounded-card border-2 border-dashed border-ink/15 bg-white/60 p-10 text-center">
      <p className="font-serif text-xl font-bold">{title}</p>
      {text && <p className="mx-auto mt-2 max-w-md text-ink-soft">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="mt-1 shrink-0">
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Arrow({ left }: { left?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className={left ? 'rotate-180' : ''}>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
