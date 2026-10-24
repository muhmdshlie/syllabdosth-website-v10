import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';

export default async function SettingsIndex() {
  await requireAdmin();
  redirect('/admin/settings/general');
}
