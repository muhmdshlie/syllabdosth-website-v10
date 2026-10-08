'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { uploadMediaAction } from '@/app/admin-actions';
import { Icon } from './icons';

export function MediaUploader() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const send = (files: FileList | null) => {
    if (!files?.length) return;
    start(async () => {
      let ok = 0; let err = '';
      for (const f of Array.from(files).slice(0, 20)) {
        const fd = new FormData();
        fd.append('file', f);
        fd.append('folder', 'library');
        const r = await uploadMediaAction(fd);
        if (r.error) err = `${f.name}: ${r.error}`; else ok++;
      }
      setMsg(err ? { ok: false, text: ok ? `${ok} uploaded. ${err}` : err } : { ok: true, text: `${ok} file${ok === 1 ? '' : 's'} uploaded.` });
      router.refresh();
    });
  };
  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); send(e.dataTransfer.files); }}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${drag ? 'border-adm-green bg-adm-green-soft' : 'border-adm-line bg-white'}`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-adm-green-soft text-adm-green"><Icon name="upload" /></span>
        <p className="text-[15px] font-medium">{busy ? 'Uploading…' : 'Drag photos here'}</p>
        <p className="text-[13px] text-adm-muted">JPG, PNG, WebP, GIF, SVG, ICO or PDF · up to 10 MB each · 20 at a time</p>
        <input ref={input} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => { send(e.target.files); e.target.value = ''; }} aria-label="Choose files to upload" />
        <button type="button" className="adm-btn-primary mt-2" disabled={busy} onClick={() => input.current?.click()}>Choose files</button>
      </div>
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`mt-3 text-[14px] font-medium ${msg.ok ? 'text-[#16784f]' : 'text-adm-red'}`}>{msg.text}</p>}
    </div>
  );
}
