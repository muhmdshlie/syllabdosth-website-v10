import { forgotPassword } from '@/app/auth-actions';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { Section } from '@/components/ui';

export default function ForgotPage() {
  return (
    <Section>
      <div className="card mx-auto max-w-md">
        <h1 className="h2">Reset your password</h1>
        <p className="mt-2 text-ink-soft">We’ll email you a link to set a new one.</p>
        <ActionForm action={forgotPassword} className="mt-6 space-y-5">
          <Field label="Email" name="email" type="email" required autoComplete="email" />
          <SubmitButton className="w-full">Send reset link</SubmitButton>
        </ActionForm>
      </div>
    </Section>
  );
}
