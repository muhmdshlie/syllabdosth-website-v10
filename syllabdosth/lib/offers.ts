/**
 * Promotional course pricing, worked out from the real course price and an admin-configured offer
 * (Admin → Offers & Coupons). Nothing is shown unless an active offer for that exact course has an
 * offer price below the course's current price, inside its start/end dates. Server and client safe.
 */
import { todayIST } from './format';
import type { Course, Offer } from './types';

// Dates are compared as India-time days (todayIST), so offers switch on and off at local midnight.

export type CoursePromo = {
  offerId: string;
  title: string;
  badge: string;
  code: string | null;
  original: number; // the course's current price
  price: number; // the offer price
  saved: number;
  percent: number; // rounded down, so it never overstates the discount
  endsOn: string | null;
};

/** Active and inside its dates. Start and end days are both included. */
export function offerIsLive(o: Offer, today = todayIST()): boolean {
  return o.active !== false && (!o.starts_on || o.starts_on <= today) && (!o.valid_until || o.valid_until >= today);
}

/** The best real promo for a course, or null when none is configured / valid. */
export function promoFor(course: Course, offers: Offer[], today = todayIST()): CoursePromo | null {
  let best: CoursePromo | null = null;
  for (const o of offers) {
    const price = Number(o.offer_price);
    if (o.course_id !== course.id || !offerIsLive(o, today)) continue;
    if (!Number.isInteger(price) || price <= 0 || !(course.price > price)) continue;
    if (best && best.price <= price) continue;
    const saved = course.price - price;
    best = {
      offerId: o.id, title: o.title, badge: (o.badge ?? '').trim(), code: o.code, original: course.price, price, saved,
      percent: Math.floor((saved / course.price) * 100), endsOn: o.valid_until,
    };
  }
  return best;
}

/** course id → promo, for listings. */
export function promoMap(courses: Course[], offers: Offer[], today = todayIST()): Map<string, CoursePromo> {
  const m = new Map<string, CoursePromo>();
  for (const c of courses) {
    const p = promoFor(c, offers, today);
    if (p) m.set(c.id, p);
  }
  return m;
}

export const promoEnds = (d: string) => new Date(`${d}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
