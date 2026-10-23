import { PageHeader } from '@/components/admin/ui';

/** Shown while the analytics figures are worked out (a long date range can take a moment). */
export default function Loading() {
  const block = 'adm-card animate-pulse bg-adm-bg';
  return (
    <div aria-busy="true" aria-live="polite">
      <PageHeader title="Website analytics" crumbs={[{ label: 'Reports' }, { label: 'Website analytics' }]} sub="Loading the figures…" />
      <div className={`${block} mb-6 h-[86px]`} />
      <div className="mb-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className={`${block} h-[118px]`} />)}
      </div>
      <div className={`${block} mb-6 h-[320px]`} />
      <div className="grid gap-6 xl:grid-cols-2">
        <div className={`${block} h-[260px]`} />
        <div className={`${block} h-[260px]`} />
      </div>
    </div>
  );
}
