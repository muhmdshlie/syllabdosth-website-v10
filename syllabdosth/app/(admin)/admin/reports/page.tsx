import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';

export default async function ReportsIndex() {
  await requireAdmin();
  redirect('/admin/reports/enrolments');
}
