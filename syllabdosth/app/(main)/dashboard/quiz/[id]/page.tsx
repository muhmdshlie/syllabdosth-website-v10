import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { submitQuizAction } from '@/app/dashboard-actions';
import { DashboardShell, Panel } from '@/components/dashboard';
import { ActionForm, SubmitButton } from '@/components/forms';
import { requireUser } from '@/lib/auth';
import { getCourseById } from '@/lib/data';
import { enrolledCourseIds, getQuiz, submissionsForUser } from '@/lib/lms';

export const metadata: Metadata = { title: 'Quiz' };

export default async function QuizPage({ params }: { params: { id: string } }) {
  const user = await requireUser(`/dashboard/quiz/${params.id}`);
  const quiz = await getQuiz(params.id);
  if (!quiz || !quiz.published) notFound();
  const allowed = user.profile.role === 'admin' || (await enrolledCourseIds(user.id)).includes(quiz.course_id);
  const [course, subs] = await Promise.all([getCourseById(quiz.course_id), submissionsForUser(user.id)]);
  const attempts = subs.filter((s) => s.quiz_id === quiz.id);
  return (
    <DashboardShell user={user} title={quiz.title}>
      <Link href="/dashboard?tab=learning" className="text-[14px] font-semibold underline">← Back to my learning</Link>
      {!allowed ? (
        <Panel title="Not available"><p className="text-ink-soft">This quiz is for learners enrolled in {course?.title ?? 'the course'}.</p></Panel>
      ) : (
        <Panel title={`${course?.title ?? 'Course'} · ${quiz.questions.length} questions · pass mark ${quiz.pass_percent}%${quiz.time_limit_mins ? ` · about ${quiz.time_limit_mins} min` : ''}`}>
          {quiz.description && <p className="mb-6 text-ink-soft">{quiz.description}</p>}
          {attempts.length > 0 && <p className="mb-6 rounded-[4px] bg-muted px-4 py-3 text-[14px]">Your attempts: {attempts.map((a) => `${a.score}/${a.max_score}`).join(', ')}</p>}
          <ActionForm action={submitQuizAction} className="space-y-6">
            <input type="hidden" name="quiz_id" value={quiz.id} />
            {quiz.questions.map((q, i) => (
              <fieldset key={i} className="rounded-card border border-line bg-white/60 p-5">
                <legend className="px-1 font-semibold">{i + 1}. {q.question}</legend>
                <div className="mt-3 space-y-2">
                  {q.options.map((o, j) => (
                    <label key={j} className="flex cursor-pointer items-center gap-3 rounded-[4px] px-3 py-2 hover:bg-muted">
                      <input type="radio" name={`q${i}`} value={j + 1} required className="h-4 w-4 accent-black" />{o}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <SubmitButton pendingText="Checking…">Submit answers</SubmitButton>
          </ActionForm>
        </Panel>
      )}
    </DashboardShell>
  );
}
