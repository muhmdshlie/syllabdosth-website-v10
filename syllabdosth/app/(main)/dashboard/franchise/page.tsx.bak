import type { Metadata } from 'next';
import Link from 'next/link';
import { DashboardShell, Panel, StatGrid, Table } from '@/components/dashboard';
import { requireRole } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Franchise dashboard',
};

export default async function FranchiseDashboard() {
  const user = await requireRole(['franchise'], '/dashboard/franchise');

  return (
    <DashboardShell user={user} title="Franchise dashboard">

      <StatGrid
        items={[
          ['Total students', 0],
          ['New enrollments', 0],
          ['Active students', 0],
          ['Available courses', 0],
        ]}
      />

      <Panel title="Student overview">
        <Table
          head={['Student', 'Course', 'Status', 'Joined', '']}
          empty="No students enrolled yet."
          rows={[]}
        />
      </Panel>

      <Panel title="Enrollment enquiries">
        <Table
          head={['Learner', 'Course', 'Mode', 'Received', 'Status', '']}
          empty="No enrollment enquiries yet."
          rows={[]}
        />
      </Panel>

      <Panel title="Available courses">
        <Table
          head={['Course', 'Duration', 'Fee', 'Students', '']}
          empty="No courses available yet."
          rows={[]}
        />
      </Panel>

      <Panel title="Quick actions">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/courses"
            className="rounded-card border border-line bg-white px-5 py-3 font-semibold hover:bg-black hover:text-white"
          >
            View Courses
          </Link>

          <Link
            href="/dashboard"
            className="rounded-card border border-line bg-white px-5 py-3 font-semibold hover:bg-black hover:text-white"
          >
            Dashboard
          </Link>
        </div>
      </Panel>

    </DashboardShell>
  );
}