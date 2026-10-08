'use client';
/** Admin panel frame: dark sidebar with collapsible menus + top bar (same layout as the previous LMS admin). */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import { clearCacheAction } from '@/app/admin-actions';
import { signOut } from '@/app/auth-actions';
import { ADMIN_NAV, QUICK_ADD, type NavItem } from '@/lib/admin/nav';
import { Icon } from './icons';

type Props = {
  children: ReactNode;
  logo: string;
  user: { name: string; email: string };
  badges: Record<string, number>;
  alerts: { label: string; count: number; href: string }[];
  demo: boolean;
};

const pathOf = (href: string) => href.split('#')[0].split('?')[0];
function isActive(pathname: string, href: string) {
  const p = pathOf(href);
  if (p === '/admin') return pathname === '/admin';
  return pathname === p || pathname.startsWith(`${p}/`);
}
/** The single best-matching child (so "All Courses" isn't lit on "Add New Course"). */
function activeChild(pathname: string, item: NavItem) {
  const hits = (item.children ?? []).filter((c) => isActive(pathname, c.href));
  return hits.sort((a, b) => pathOf(b.href).length - pathOf(a.href).length)[0]?.href;
}

export function AdminFrame({ children, logo, user, badges, alerts, demo }: Props) {
  const pathname = usePathname() ?? '/admin';
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    try { setCollapsed(localStorage.getItem('sd_admin_collapsed') === '1'); } catch { /* ignore */ }
  }, []);
  const toggle = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setCollapsed((c) => { try { localStorage.setItem('sd_admin_collapsed', c ? '0' : '1'); } catch { /* ignore */ } return !c; });
    } else setMobileOpen((o) => !o);
  };
  const totalAlerts = alerts.reduce((n, a) => n + a.count, 0);

  return (
    <div className="adm min-h-screen bg-adm-bg">
      {/* sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-adm-side text-[#D5D5E0] transition-[width,transform] duration-300 ${collapsed ? 'lg:w-[78px]' : 'lg:w-[272px]'} w-[272px] ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        aria-label="Admin menu"
      >
        <div className="flex h-[78px] shrink-0 items-center justify-center border-b border-white/[0.07] px-5">
          <Link href="/admin" className="flex items-center" aria-label="Admin dashboard">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="Syllabdosth" className={`w-auto object-contain transition-all ${collapsed ? 'lg:h-6 lg:max-w-[48px]' : 'h-8 max-w-[190px]'} h-8 max-w-[190px]`} />
          </Link>
        </div>
        <nav className="adm-scroll flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {ADMIN_NAV.map((item) => <NavEntry key={item.label} item={item} pathname={pathname} collapsed={collapsed} badge={item.badge ? badges[item.badge] : 0} />)}
          </ul>
        </nav>
        {demo && <p className={`m-3 rounded-lg bg-white/5 p-3 text-[12px] leading-snug text-[#A9A9B8] ${collapsed ? 'lg:hidden' : ''}`}>Demo mode: changes are kept in memory until the server restarts.</p>}
      </aside>
      {mobileOpen && <button aria-label="Close menu" className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* main */}
      <div className={`transition-[padding] duration-300 ${collapsed ? 'lg:pl-[78px]' : 'lg:pl-[272px]'}`}>
        <header className="sticky top-0 z-30 flex h-[78px] items-center gap-3 border-b border-adm-line bg-white px-4 sm:px-6">
          <button onClick={toggle} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-adm-line text-adm-text hover:border-adm-green hover:text-adm-green" aria-label="Toggle menu">
            <Icon name="menu" />
          </button>
          <ClearCache />
          <Dropdown label={<><Icon name="plus" size={18} /> <span className="hidden sm:inline">Add new</span> <Icon name="chevron" size={16} /></>} buttonClass="adm-btn-outline" align="left">
            {QUICK_ADD.map((q) => <Link key={q.href} href={q.href} className="block rounded-lg px-3 py-2 text-[14px] hover:bg-adm-bg">{q.label}</Link>)}
          </Dropdown>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <a href="/" target="_blank" rel="noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full border border-adm-line text-adm-muted hover:text-adm-green" title="View website" aria-label="View website"><Icon name="globe" /></a>
            <Dropdown
              label={<span className="relative"><Icon name="bell" />{totalAlerts > 0 && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-adm-red" />}</span>}
              buttonClass="flex h-10 w-10 items-center justify-center rounded-full border border-adm-line text-adm-muted hover:text-adm-green"
              ariaLabel={`Notifications (${totalAlerts})`}
            >
              <p className="px-3 pb-2 pt-1 text-[12px] font-semibold uppercase tracking-wide text-adm-muted">Needs attention</p>
              {alerts.filter((a) => a.count > 0).length === 0 && <p className="px-3 py-2 text-[14px] text-adm-muted">All caught up 🎉</p>}
              {alerts.filter((a) => a.count > 0).map((a) => (
                <Link key={a.href} href={a.href} className="flex items-center justify-between gap-6 rounded-lg px-3 py-2 text-[14px] hover:bg-adm-bg">
                  {a.label}<span className="adm-badge bg-adm-red-soft text-adm-red">{a.count}</span>
                </Link>
              ))}
            </Dropdown>
            <Dropdown
              label={<><span className="flex h-9 w-9 items-center justify-center rounded-full bg-adm-green-soft text-[13px] font-semibold text-adm-green">{initials(user.name)}</span><span className="hidden text-left text-[14px] font-medium text-adm-text md:block">{user.name}</span><Icon name="chevron" size={16} className="hidden text-adm-muted md:block" /></>}
              buttonClass="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-adm-bg"
              ariaLabel="Account menu"
            >
              <div className="border-b border-adm-line px-3 pb-2 pt-1">
                <p className="text-[14px] font-medium">{user.name}</p>
                <p className="text-[12px] text-adm-muted">{user.email}</p>
              </div>
              <a href="/" target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] hover:bg-adm-bg"><Icon name="external" size={16} /> View website</a>
              <Link href="/admin/settings/general" className="flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] hover:bg-adm-bg"><Icon name="system" size={16} /> Settings</Link>
              <form action={signOut}><button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] text-adm-red hover:bg-adm-red-soft"><Icon name="logout" size={16} /> Log out</button></form>
            </Dropdown>
          </div>
        </header>
        <main id="main" className="px-4 py-6 sm:px-6 lg:py-7">{children}</main>
      </div>
    </div>
  );
}

function NavEntry({ item, pathname, collapsed, badge }: { item: NavItem; pathname: string; collapsed: boolean; badge?: number }) {
  const child = activeChild(pathname, item);
  const [open, setOpen] = useState(!!child);
  useEffect(() => { if (child) setOpen(true); }, [child]);
  const base = 'group flex w-full items-center gap-3 rounded-[10px] px-4 py-3 text-[15px] transition-colors';
  const pill = !!badge && badge > 0 && <span className={`ml-auto rounded-full bg-adm-red px-2 py-0.5 text-[11px] font-semibold text-white ${collapsed ? 'lg:hidden' : ''}`}>{badge}</span>;

  if (!item.children) {
    const active = isActive(pathname, item.href!);
    return (
      <li>
        <Link href={item.href!} title={collapsed ? item.label : undefined} aria-current={active ? 'page' : undefined}
          className={`${base} min-w-0 ${active ? 'bg-adm-green text-white shadow-[0_8px_20px_-10px_rgba(39,174,122,.8)]' : 'hover:bg-white/[0.06] hover:text-white'}`}>
          <Icon name={item.icon} className="shrink-0" />
          <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
          {pill}
        </Link>
      </li>
    );
  }
  return (
    <li>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} title={collapsed ? item.label : undefined}
        className={`${base} ${child ? 'text-white' : 'hover:bg-white/[0.06] hover:text-white'}`}>
        <Icon name={item.icon} className="shrink-0" />
        <span className={`truncate text-left ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
        {pill}
        <Icon name="chevron" size={16} className={`${badge ? '' : 'ml-auto'} shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${collapsed ? 'lg:hidden' : ''}`} />
      </button>
      {open && (
        <ul className={`mb-1 mt-0.5 space-y-0.5 pl-[46px] ${collapsed ? 'lg:hidden' : ''}`}>
          {item.children.map((c) => {
            const active = c.href === child;
            return (
              <li key={c.href}>
                <Link href={c.href} aria-current={active ? 'page' : undefined} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[14px] transition-colors ${active ? 'bg-white/[0.06] text-white' : 'text-[#A9A9B8] hover:text-white'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-adm-green' : 'bg-white/20'}`} />{c.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function ClearCache() {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="adm-btn-outline hidden sm:inline-flex"
      disabled={pending}
      onClick={() => start(async () => { await clearCacheAction(); setDone(true); setTimeout(() => setDone(false), 2500); })}
    >
      <Icon name={done ? 'check' : 'cache'} size={18} /> {pending ? 'Clearing…' : done ? 'Cache cleared' : 'Clear Cache'}
    </button>
  );
}

export function Dropdown({ label, children, buttonClass, align = 'right', ariaLabel }: { label: ReactNode; children: ReactNode; buttonClass: string; align?: 'left' | 'right'; ariaLabel?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" className={buttonClass} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" aria-label={ariaLabel}>{label}</button>
      {open && (
        <div className={`absolute z-50 mt-2 min-w-[220px] rounded-xl border border-adm-line bg-white p-1.5 shadow-[0_20px_40px_-20px_rgba(16,24,40,.35)] ${align === 'right' ? 'right-0' : 'left-0'}`} onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setOpen(false); }}>
          {children}
        </div>
      )}
    </div>
  );
}

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'A';
