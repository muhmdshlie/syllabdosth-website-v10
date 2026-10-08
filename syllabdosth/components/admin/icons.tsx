/** Line icons for the admin panel (24×24, 1.6 stroke). */
import type { SVGProps } from 'react';

const P: Record<string, string> = {
  dashboard: 'M12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm0 0 3.5-3.5M4 15a8 8 0 1 1 16 0M5.5 19h13',
  enroll: 'M4 5.5h6a2 2 0 0 1 2 2V19a1.5 1.5 0 0 0-1.5-1.5H4v-12Zm16 0h-6a2 2 0 0 0-2 2V19a1.5 1.5 0 0 1 1.5-1.5H20v-12Z',
  course: 'M6 4h10a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2V4Zm0 14a2 2 0 0 1 2-2h10M10 8h4',
  students: 'M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 7c.9-3 3.6-5 7-5s6.1 2 7 5M16 5.5l2.5-1.5M8 5.5 5.5 4',
  quiz: 'M7 3.5h7l4 4v13H7v-17Zm7 0v4h4M9.5 12.5h6M9.5 16h6M9.5 9h2',
  instructor: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c.9-3 3.6-5 7-5s6.1 2 7 5',
  organisation: 'M3.5 20h17M5 20V9l7-4.5L19 9v11M9 20v-5h6v5M9 11h.01M15 11h.01',
  live: 'M4 6.5h11v11H4v-11Zm11 4 5-3v9l-5-3M8 10.5l3 1.5-3 1.5v-3Z',
  staff: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 8.5c.7-2.7 3.1-4.5 6-4.5s5.3 1.8 6 4.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 15.2c1.5.6 2.6 2.1 3 4.3',
  media: 'M4 5h16v14H4V5Zm0 10 4.5-4.5L13 15m-2-2 2.5-2.5L20 17M15.5 9h.01',
  ai: 'M8 8h8v8H8V8Zm-3 2H3m2 4H3m18-4h-2m2 4h-2M10 5V3m4 2V3m-4 18v-2m4 2v-2M11 11h2v2h-2v-2',
  blog: 'M5 19h3.5L19 8.5 15.5 5 5 15.5V19Zm8.5-12 3.5 3.5',
  services: 'M4 8h16v11H4V8Zm5 0V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v2M4 13h16',
  notification: 'M18 15.5V11a6 6 0 1 0-12 0v4.5L4.5 17h15L18 15.5ZM10 20a2 2 0 0 0 4 0',
  support: 'M5 13v-1a7 7 0 0 1 14 0v1M5 13h2.5v5H6a1 1 0 0 1-1-1v-4Zm14 0h-2.5v5H18a1 1 0 0 0 1-1v-4Zm-2.5 5c0 1.5-1.5 2.5-4 2.5',
  marketing: 'M4 5h16v14H4V5Zm0 5h16M4 14.5h16M9.3 5v14M14.7 5v14',
  reports: 'M7 3.5h10v17H7v-17Zm3 4h4M10 11h4M10 14.5h4M9 3.5V2.5m6 1V2.5',
  cms: 'M12 4 3.5 8 12 12l8.5-4L12 4Zm-8.5 8L12 16l8.5-4M3.5 16 12 20l8.5-4',
  website: 'm14.5 6.5 3 3M4 20l4.5-1L19 8.5 15.5 5 5 15.5 4 20Zm3-11L4.5 6.5 6.5 4.5 9 7m6 6 2.5 2.5-2 2-2.5-2.5',
  email: 'M3.5 6h17v12h-17V6Zm0 .5L12 13l8.5-6.5',
  sms: 'M4 5h16v11H9l-5 4V5Zm4 5h.01M12 10h.01M16 10h.01',
  system: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  addon: 'M10 4.5a2 2 0 1 1 4 0V6h4v4h-1.5a2 2 0 1 0 0 4H18v4h-4v-1.5a2 2 0 1 0-4 0V18H6v-4h1.5a2 2 0 1 0 0-4H6V6h4V4.5Z',
  utility: 'M7 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm10 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM12 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM8.5 7l2.5 9m4.5-9L13 16',
  menu: 'M4 7h16M4 12h16M4 17h16',
  cache: 'M4 8.5h16v10H4v-10Zm2-3h12M8 13h.01M12 13h4',
  plus: 'M12 5v14M5 12h14',
  chevron: 'm6 9 6 6 6-6',
  chevronRight: 'm9 6 6 6-6 6',
  chevronLeft: 'm15 6-6 6 6 6',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9Z',
  bell: 'M18 15.5V11a6 6 0 1 0-12 0v4.5L4.5 17h15L18 15.5ZM10 20a2 2 0 0 0 4 0',
  logout: 'M14 4h5v16h-5M10 8l-4 4 4 4m-4-4h10',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 2-4-4',
  edit: 'M5 19h3.5L19 8.5 15.5 5 5 15.5V19Z',
  trash: 'M5 7h14M10 11v6m4-6v6M6.5 7l1 13h9l1-13M9.5 7V4.5h5V7',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  download: 'M12 4v11m0 0-4-4m4 4 4-4M5 19h14',
  upload: 'M12 16V5m0 0-4 4m4-4 4 4M5 19h14',
  image: 'M4 5h16v14H4V5Zm0 10 4.5-4.5L13 15m-2-2 2.5-2.5L20 17M15.5 9h.01',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6 6 18',
  external: 'M14 5h5v5m0-5-8 8M18 14v5H5V6h5',
  copy: 'M8 8h11v11H8V8Zm-3 8V5h11',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 8.5c.7-2.7 3.1-4.5 6-4.5s5.3 1.8 6 4.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 15.2c1.5.6 2.6 2.1 3 4.3',
  book: 'M5 5.5A1.5 1.5 0 0 1 6.5 4H12v15H6.5A1.5 1.5 0 0 0 5 20.5v-15Zm14 0A1.5 1.5 0 0 0 17.5 4H12v15h5.5a1.5 1.5 0 0 1 1.5 1.5v-15Z',
  coins: 'M12 9c4 0 7-1.3 7-3s-3-3-7-3-7 1.3-7 3 3 3 7 3Zm-7-3v4c0 1.7 3 3 7 3s7-1.3 7-3V6M5 10v4c0 1.7 3 3 7 3s7-1.3 7-3v-4m-14 4v4c0 1.7 3 3 7 3s7-1.3 7-3v-4',
  calendar: 'M4 6h16v14H4V6Zm0 4h16M8 3.5V7m8-3.5V7',
  arrowUp: 'M12 19V5m0 0-5 5m5-5 5 5',
  arrowDown: 'M12 5v14m0 0-5-5m5 5 5-5',
  drag: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  send: 'M4 12 20 4l-5 16-3-7-8-1Z',
  sparkle: 'M12 3.5 13.8 10 20.5 12l-6.7 2L12 20.5 10.2 14 3.5 12l6.7-2L12 3.5Z',
};

export function Icon({ name, size = 20, className, ...rest }: { name: string; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className} {...rest}>
      <path d={P[name] ?? P.dashboard} />
    </svg>
  );
}
