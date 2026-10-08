import { updatePassword } from '@/app/auth-actions';
import { ActionForm, Field, SubmitButton } from '@/components/forms';
import { Section } from '@/components/ui';

export default function ResetPage() {
  return (
    <Section>
      <div className="card mx-auto max-w-md">
        <h1 className="h2">Choose a new password</h1>
        <ActionForm action={updatePassword} className="mt-6 space-y-5">
          <Field label="New password" name="password" type="password" required autoComplete="new-password" />
          <Field label="Confirm password" name="confirm" type="password" required autoComplete="new-password" />
          <SubmitButton className="w-full">Update password</SubmitButton>
        </ActionForm>
      </div>
    </Section>
  );
}
