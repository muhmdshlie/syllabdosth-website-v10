import { demoLogin } from '@/app/auth-actions';

const roles = [
  ['learner', 'Learner / customer', 'My bookings & courses'],
  ['professional', 'Professional', 'Accept booking requests'],
  ['faculty', 'Faculty', 'My courses & enquiries'],
  ['admin', 'Admin', 'Manage everything'],
] as const;

export function DemoLogin({ next }: { next: string }) {
  return (
    <div className="rounded-card bg-taupe/30 p-6">
      <p className="font-semibold">Try a demo account</p>
      <p className="mt-1 text-[14px] text-ink-deep">Demo mode is on, so real login is switched off. Pick a role to explore its dashboard.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {roles.map(([role, label, hint]) => (
          <form key={role} action={demoLogin}>
            <input type="hidden" name="role" value={role} />
            <input type="hidden" name="next" value={next} />
            <button className="w-full rounded-2xl bg-white p-4 text-left hover:shadow-md" type="submit">
              <span className="block font-semibold">{label}</span>
              <span className="text-[13px] text-ink-soft">{hint}</span>
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
