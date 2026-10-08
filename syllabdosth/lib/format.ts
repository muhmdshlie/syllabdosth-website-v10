import type { ApplicationStatus, BookingStatus, EnquiryStatus } from './types';

/** ₹49,999 — whole rupees, Indian grouping, never wraps ".00" onto a new line. */
export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

/** Today's date (YYYY-MM-DD) in India, whatever timezone the server runs in. */
export const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export const fmtDate = (d: string) => {
  if (!d) return '—';
  const x = new Date(d.length === 10 ? d + 'T00:00:00Z' : d);
  return isNaN(x.getTime()) ? d : x.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: d.length === 10 ? 'UTC' : 'Asia/Kolkata' });
};

export const fmtTime = (t: string) => {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, '0')} ${ap}`;
};

export const durationLabel = (days: number) => (days === 1 ? '1 day' : `${days} days`);

export const bookingStatusLabel: Record<BookingStatus, string> = {
  pending: 'Pending confirmation',
  confirmed: 'Confirmed',
  declined: 'Declined',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export const statusTone = (s: BookingStatus | EnquiryStatus | ApplicationStatus) =>
  ({
    pending: 'bg-pending text-ink',
    new: 'bg-pending text-ink',
    reviewing: 'bg-pending text-ink',
    contacted: 'bg-soft text-ink',
    confirmed: 'bg-tan text-ink',
    approved: 'bg-tan text-ink',
    converted: 'bg-tan text-ink',
    completed: 'bg-ink text-white',
    declined: 'bg-muted text-ink-soft',
    rejected: 'bg-muted text-ink-soft',
    cancelled: 'bg-muted text-ink-soft',
    closed: 'bg-muted text-ink-soft',
  })[s] ?? 'bg-muted text-ink';
