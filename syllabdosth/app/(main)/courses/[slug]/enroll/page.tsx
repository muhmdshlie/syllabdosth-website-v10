import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { enrollAction } from '@/app/actions';
import { ActionForm, Field, SelectField, SubmitButton, TextArea } from '@/components/forms';
import { Fact, PageHeader, Section } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth';
import { getCourse } from '@/lib/data';
import { durationLabel, inr } from '@/lib/format';

export const metadata: Metadata = { title: 'Enroll' };

export default async function EnrollPage({ params }: { params: { slug: string } }) {
  const course = await getCourse(params.slug);
  if (!course) notFound();
  const user = await getCurrentUser();
  return (
    <Section>
      <PageHeader crumbs={[{ href: '/courses', label: 'Courses' }, { href: `/courses/${course.slug}`, label: course.title }, { label: 'Enroll' }]} title={`Enroll in ${course.title}`} sub="Send your details and our admissions team will call you within one working day to confirm your batch. No payment is taken now." />
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="card">
          <ActionForm action={enrollAction} className="grid gap-5 sm:grid-cols-2">
            <input type="hidden" name="course_id" value={course.id} />
            <Field label="Your name" name="name" required autoComplete="name" defaultValue={user?.profile.full_name} />
            <Field label="Phone number" name="phone" type="tel" required autoComplete="tel" placeholder="98xxx xxxxx" defaultValue={user?.profile.phone ?? ''} />
            <Field label="Email" name="email" type="email" required autoComplete="email" defaultValue={user?.email ?? ''} className="sm:col-span-2" />
            <SelectField label="How do you want to learn?" name="mode" options={[{ value: 'Online', label: 'Online' }, { value: 'Offline', label: 'Offline (at a centre)' }, { value: 'Either', label: 'Either is fine' }]} className="sm:col-span-2" />
            <TextArea label="Anything we should know?" name="message" placeholder="Preferred batch timing, questions about the course…" className="sm:col-span-2" />
            <div className="sm:col-span-2"><SubmitButton className="w-full">Send enrollment request</SubmitButton></div>
          </ActionForm>
        </div>
        <aside className="card space-y-3">
          <p className="font-serif text-[20px] font-bold">{course.title}</p>
          <div className="grid grid-cols-2 gap-3">
            <Fact label="Course fee" value={inr(course.price)} />
            <Fact label="Duration" value={durationLabel(course.duration_days)} />
            <Fact label="Level" value={course.level} />
            <Fact label="Mode" value={course.mode} />
          </div>
          <p className="pt-2 text-[14px] text-ink-soft">Online payment is coming soon. For now, fees are collected after your batch is confirmed.</p>
        </aside>
      </div>
    </Section>
  );
}
