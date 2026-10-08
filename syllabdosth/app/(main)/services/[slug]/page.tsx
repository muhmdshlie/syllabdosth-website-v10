import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createBookingAction } from '@/app/actions';
import { ActionForm, Field, SubmitButton, TextArea } from '@/components/forms';
import { Photo } from '@/components/motion';
import { Arrow, Avatar, Fact, Section, Tag } from '@/components/ui';
import { servicePhoto } from '@/lib/images';
import { getCurrentUser } from '@/lib/auth';
import { getService, professionalsForService } from '@/lib/data';
import { inr, todayIST } from '@/lib/format';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const s = await getService(params.slug);
  return s ? { title: `Book ${s.title}`, description: s.summary } : {};
}

export default async function BookServicePage({ params, searchParams }: { params: { slug: string }; searchParams: { pro?: string } }) {
  const service = await getService(params.slug);
  if (!service) notFound();
  const [pros, user] = await Promise.all([professionalsForService(service.id), getCurrentUser()]);
  const selected = pros.find((p) => p.id === searchParams.pro) ?? pros[0];
  const today = todayIST();

  return (
    <Section>
      <Link href="/services" className="inline-flex items-center gap-2 text-[14px] font-semibold text-ink-deep hover:underline"><Arrow left /> Back to services</Link>
      <h1 className="h1 mt-4">Book {service.title}</h1>
      <p className="body-l mt-3 max-w-3xl text-ink-deep-muted">Choose your preferred date and share a few details. Your request goes to the professional, who confirms the appointment with you.</p>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_460px]">
        <div className="space-y-6">
          <div className="card space-y-6">
            <div className="flex gap-5">
              <Photo src={servicePhoto(service.slug, 300, service.image_url)} alt={service.title} eager className="h-24 w-24 shrink-0 rounded-2xl ring-4 ring-paper sm:h-28 sm:w-28" />
              <div>
                <Tag>{service.category}</Tag>
                <h2 className="h2 mt-2">{service.title}</h2>
                <p className="mt-2 text-ink-soft">{service.summary} {service.description}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Fact label="Starting from" value={inr(service.price_from)} />
              <Fact label="Duration" value={service.duration} />
              <Fact label="Booking" value="Request & confirm" />
            </div>
            {pros.length > 1 && (
              <div>
                <p className="label">Choose a professional</p>
                <div className="flex flex-wrap gap-2">
                  {pros.map((p) => (
                    <Link key={p.id} href={`/services/${service.slug}?pro=${p.id}`} scroll={false} className={`rounded-full px-4 py-2 text-[14px] font-semibold ${p.id === selected?.id ? 'bg-noir text-white' : 'bg-muted hover:bg-line'}`}>{p.name}</Link>
                  ))}
                </div>
              </div>
            )}
            {selected ? (
              <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-noir p-5 text-white">
                <Avatar text={selected.initials} size={48} src={selected.photo_url ?? undefined} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{selected.name}</p>
                  <p className="text-[13px] text-ink-dark-muted">✓ Verified professional · {selected.city} · ★ {selected.rating} · {selected.bookings_count}+ bookings</p>
                </div>
                <Link href={`/pros/${selected.slug}`} className="btn-ghost-dark btn-sm">View profile</Link>
              </div>
            ) : (
              <p className="rounded-2xl bg-pending p-5 text-[14px]">No professional is taking this service right now. <Link className="font-semibold underline" href="/contact">Contact us</Link> and we&apos;ll arrange one.</p>
            )}
          </div>
          <div className="card">
            <h2 className="font-serif text-[20px] font-bold">What happens after you request?</h2>
            <ol className="mt-4 space-y-3 text-[15px] text-ink-soft">
              {['The professional receives your preferred date, time and requirements.', 'They review the request and call you to confirm — usually within 4 hours.', 'Final price and timing are agreed before the appointment. You pay after the service.'].map((t, i) => (
                <li key={t} className="flex gap-3"><span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-soft text-[13px] font-semibold text-ink">{i + 1}</span>{t}</li>
              ))}
            </ol>
          </div>
        </div>

        <div className="card h-fit">
          <div className="flex items-baseline justify-between border-b border-line pb-5">
            <h2 className="h3">Request booking</h2>
            <p className="text-right"><span className="block text-[12px] text-ink-soft">Starting price</span><span className="font-serif text-[26px] font-bold">{inr(service.price_from)}</span></p>
          </div>
          {selected && (
            <ActionForm action={createBookingAction} className="mt-6 grid gap-5 sm:grid-cols-2">
              <input type="hidden" name="service_id" value={service.id} />
              <input type="hidden" name="professional_id" value={selected.id} />
              <Field label="Your name" name="name" required autoComplete="name" defaultValue={user?.profile.full_name} />
              <Field label="Phone number" name="phone" type="tel" required autoComplete="tel" placeholder="98xxx xxxxx" defaultValue={user?.profile.phone ?? ''} />
              <Field label="Preferred date" name="preferred_date" type="date" required min={today} />
              <Field label="Preferred time" name="preferred_time" type="time" required />
              <Field label="Service location" name="location" required placeholder="Address or venue, area & pincode" className="sm:col-span-2" autoComplete="street-address" />
              <TextArea label="Requirements" name="requirements" placeholder="Look you want, number of people, etc." className="sm:col-span-2" />
              <div className="sm:col-span-2">
                <SubmitButton className="w-full" pendingText="Sending request…">Request booking</SubmitButton>
                <p className="mt-3 text-center text-[13px] text-ink-soft">No payment is taken now. The professional confirms before the appointment is final.</p>
                {!user && <p className="mt-2 text-center text-[13px] text-ink-soft"><Link href={`/login?next=/services/${service.slug}`} className="font-semibold underline">Log in</Link> to track all your bookings in one place.</p>}
              </div>
            </ActionForm>
          )}
        </div>
      </div>
    </Section>
  );
}
