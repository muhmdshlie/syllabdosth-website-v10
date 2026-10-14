'use server';
/** Admin wallet actions. Every action starts with requireRole(['admin']). */
import { revalidatePath } from 'next/cache';
import type { ActionState } from '@/lib/action-state';
import { requireRole } from '@/lib/auth';
import { isDemo } from '@/lib/config';
import { createAdminClient } from '@/lib/supabase/server';

const SOURCE_TYPES = ['enrollment', 'booking', 'other'];
const AMOUNT_PATTERN = /^\d{1,7}(\.\d{1,2})?$/; // up to ₹10,00,000 with paise

/** Records a commission and credits the franchise wallet (one database transaction). */
export async function addCommissionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireRole(['admin'], '/admin/wallet/commissions');

  const organisationId = String(fd.get('organisation_id') ?? '').trim();
  const sourceType = String(fd.get('source_type') ?? '').trim();
  const sourceRef = String(fd.get('source_ref') ?? '').trim();
  const amount = String(fd.get('amount') ?? '').trim();
  const note = String(fd.get('note') ?? '').trim().slice(0, 300);

  if (!organisationId) return { error: 'Choose a franchise.' };
  if (!SOURCE_TYPES.includes(sourceType)) return { error: 'Choose what the commission is for.' };
  if (!sourceRef || sourceRef.length > 100) return { error: 'Enter the enrolment or booking reference (up to 100 characters).' };
  if (!AMOUNT_PATTERN.test(amount) || Number(amount) <= 0) return { error: 'Enter an amount in rupees, for example 1500 or 1500.50.' };
  if (isDemo) return { error: 'Wallets need the live database. Connect Supabase first.' };

  const admin = createAdminClient();
  const { error } = await admin.rpc('add_commission', {
    p_organisation_id: organisationId,
    p_source_type: sourceType,
    p_source_ref: sourceRef,
    p_amount: amount, // sent as text so no floating-point rounding happens
    p_note: note,
    p_actor: me.id,
  });

  if (error) {
    if (error.code === '23505') return { error: 'This enrolment or booking already has a commission.' };
    return { error: error.message || 'Could not record the commission.' };
  }

  revalidatePath('/admin/wallet', 'layout');
  return { ok: true, message: `Commission of ₹${amount} credited to the franchise wallet.` };
}
