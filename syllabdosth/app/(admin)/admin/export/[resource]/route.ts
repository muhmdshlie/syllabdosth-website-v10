import { NextResponse, type NextRequest } from 'next/server';
import { allRecords } from '@/lib/admin/crud';
import { getResource } from '@/lib/admin/resources';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s; // stop spreadsheet formulas
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** CSV download of any admin table, with the list page's search and filters. */
export async function GET(req: NextRequest, { params }: { params: { resource: string } }) {
  const user = await getCurrentUser();
  if (!user || user.profile.role !== 'admin') return new NextResponse('Not allowed', { status: 403 });
  const r = getResource(params.resource);
  if (!r) return new NextResponse('Not found', { status: 404 });
  const sp = req.nextUrl.searchParams;
  const filters = Object.fromEntries((r.filters ?? []).map((f) => [f.name, sp.get(f.name) ?? '']));
  const to = sp.get('to') ?? undefined;
  const fromDay = sp.get('from');
  const from = fromDay ? new Date(`${fromDay}T00:00:00+05:30`).toISOString() : undefined;
  const rows = await allRecords(r, { q: sp.get('q') ?? '', filters, from, to });
  const secret = new Set(['encrypted_password']);
  const cols = Array.from(new Set(rows.flatMap((x) => Object.keys(x)))).filter((c) => !secret.has(c));
  const csv = '﻿' + [cols.join(','), ...rows.map((row) => cols.map((c) => cell(row[c])).join(','))].join('\r\n');
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="syllabdosth-${r.key}-${date}.csv"`, 'Cache-Control': 'no-store' } });
}
