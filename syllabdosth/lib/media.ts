import 'server-only';
/** Image and file uploads (Admin → Media Library and every image field in the admin panel). */
import { isDemo } from './config';
import { newId, table } from './store';
import { createAdminClient } from './supabase/server';
import type { MediaItem } from './types';

export const MEDIA_BUCKET = 'media';
export const MEDIA_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico', 'application/pdf': 'pdf',
};
export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;

const safeName = (n: string) => n.toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'file';

export function checkUpload(file: File): string | null {
  if (!MEDIA_TYPES[file.type]) return 'Upload a JPG, PNG, WebP, GIF, SVG, ICO or PDF file.';
  if (file.size > MAX_MEDIA_BYTES) return 'Files must be 10 MB or smaller.';
  if (file.size === 0) return 'That file is empty.';
  return null;
}

export async function uploadMedia(file: File, folder = 'general', alt = ''): Promise<MediaItem> {
  const err = checkUpload(file);
  if (err) throw new Error(err);
  const ext = MEDIA_TYPES[file.type];
  const path = `${folder.replace(/[^a-z0-9-]/gi, '') || 'general'}/${safeName(file.name)}-${Date.now().toString(36)}.${ext}`;
  const base = { name: file.name.slice(0, 120), path, mime: file.type, size_bytes: file.size, alt, folder };
  if (isDemo) {
    // Demo mode has no storage: keep the file in memory as a data URL.
    const url = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`;
    const item: MediaItem = { ...base, id: newId('md'), url, created_at: new Date().toISOString() };
    table<MediaItem>('media').unshift(item);
    return item;
  }
  const client = createAdminClient();
  const put = () => client.storage.from(MEDIA_BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
  let { error } = await put();
  if (error && /bucket not found|not found/i.test(error.message)) {
    await client.storage.createBucket(MEDIA_BUCKET, { public: true, fileSizeLimit: MAX_MEDIA_BYTES, allowedMimeTypes: Object.keys(MEDIA_TYPES) });
    ({ error } = await put());
  }
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const url = client.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
  const { data, error: e2 } = await client.from('media').insert({ ...base, url }).select('*').single();
  if (e2) throw new Error(e2.message);
  return data as MediaItem;
}

export async function listMedia(q = '', limit = 200): Promise<MediaItem[]> {
  if (isDemo) return table<MediaItem>('media').filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase())).slice(0, limit);
  let query = createAdminClient().from('media').select('*').order('created_at', { ascending: false }).limit(limit);
  if (q) query = query.ilike('name', `*${q.replace(/[,()*%]/g, '')}*`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as MediaItem[];
}

export async function deleteMedia(id: string) {
  if (isDemo) {
    const t = table<MediaItem>('media');
    const i = t.findIndex((m) => m.id === id);
    if (i >= 0) t.splice(i, 1);
    return;
  }
  const client = createAdminClient();
  const { data } = await client.from('media').select('path').eq('id', id).maybeSingle();
  if (data?.path) await client.storage.from(MEDIA_BUCKET).remove([data.path]);
  const { error } = await client.from('media').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateMediaAlt(id: string, alt: string) {
  if (isDemo) { const m = table<MediaItem>('media').find((x) => x.id === id); if (m) m.alt = alt; return; }
  const { error } = await createAdminClient().from('media').update({ alt }).eq('id', id);
  if (error) throw new Error(error.message);
}
