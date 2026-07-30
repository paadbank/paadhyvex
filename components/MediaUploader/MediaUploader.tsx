'use client';

import { useRef, useState } from 'react';
import { kindForFile, uploadStoryMedia, deleteStoryMedia, type MediaKind, type MediaProvider } from '@/lib/media/upload';
import styles from './MediaUploader.module.css';

export type MediaItem = {
  clientId: string;
  url: string;
  type: MediaKind;
  storagePath: string | null;
  provider: MediaProvider | null;
  status: 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
};

export function mediaItemFromExisting(url: string, type: MediaKind, storagePath: string | null, provider: MediaProvider | null): MediaItem {
  return { clientId: crypto.randomUUID(), url, type, storagePath, provider, status: 'done', progress: 100 };
}

export default function MediaUploader({ items, onChange, theme, maxItems, accept = 'image/*,video/*', label = 'Add photos or videos' }: {
  items: MediaItem[];
  onChange: React.Dispatch<React.SetStateAction<MediaItem[]>>;
  theme: string;
  maxItems?: number;
  accept?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Always applied as a functional update so concurrent uploads (each holding
  // a closure from the moment they started) never clobber each other's progress.
  const patch = (clientId: string, changes: Partial<MediaItem>) => {
    onChange(prevItems => prevItems.map(i => i.clientId === clientId ? { ...i, ...changes } : i));
  };

  const addFiles = (files: FileList | File[]) => {
    const remaining = maxItems !== undefined ? Math.max(0, maxItems - items.length) : Infinity;
    const list = Array.from(files).slice(0, remaining);
    const staged: MediaItem[] = [];

    for (const file of list) {
      const kind = kindForFile(file);
      if (!kind) continue;
      const clientId = crypto.randomUUID();
      staged.push({
        clientId,
        url: URL.createObjectURL(file),
        type: kind,
        storagePath: null,
        provider: null,
        status: 'uploading',
        progress: 0,
      });

      uploadStoryMedia(file, (pct) => patch(clientId, { progress: pct }))
        .then((result) => patch(clientId, {
          url: result.url,
          storagePath: result.storagePath,
          provider: result.provider,
          status: 'done',
          progress: 100,
        }))
        .catch((err: Error) => patch(clientId, { status: 'error', error: err.message }));
    }

    if (staged.length) onChange(prevItems => [...prevItems, ...staged]);
  };

  const removeItem = async (clientId: string) => {
    const item = items.find(i => i.clientId === clientId);
    onChange(prevItems => prevItems.filter(i => i.clientId !== clientId));
    if (item?.status === 'done') await deleteStoryMedia(item);
  };

  const moveItem = (clientId: string, dir: -1 | 1) => {
    onChange(prevItems => {
      const idx = prevItems.findIndex(i => i.clientId === clientId);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= prevItems.length) return prevItems;
      const arr = [...prevItems];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  const atCapacity = maxItems !== undefined && items.length >= maxItems;

  return (
    <div className={styles.wrap}>
      {!atCapacity && (
        <div
          className={`${styles.dropzone} ${styles[`dropzone_${theme}`]} ${dragOver ? styles.dropzoneActive : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>{label}</span>
          <span className={styles.dropzoneHint}>Click or drag files here — up to 100MB</span>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={maxItems !== 1}
            hidden
            onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }}
          />
        </div>
      )}

      {items.length > 0 && (
        <div className={styles.grid}>
          {items.map((item, i) => (
            <div key={item.clientId} className={`${styles.tile} ${styles[`tile_${theme}`]}`}>
              {item.type === 'video' ? (
                <video src={item.url} className={styles.tileMedia} muted />
              ) : (
                <img src={item.url} className={styles.tileMedia} alt="" />
              )}

              {item.type === 'video' && (
                <span className={styles.videoBadge}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                </span>
              )}

              {item.status === 'uploading' && (
                <div className={styles.tileOverlay}>
                  <div className={styles.progressRing}>{item.progress}%</div>
                </div>
              )}

              {item.status === 'error' && (
                <div className={`${styles.tileOverlay} ${styles.tileError}`} title={item.error}>
                  <span>⚠️ Failed</span>
                </div>
              )}

              <div className={styles.tileControls}>
                <button type="button" onClick={() => moveItem(item.clientId, -1)} disabled={i === 0} title="Move earlier">‹</button>
                <button type="button" onClick={() => moveItem(item.clientId, 1)} disabled={i === items.length - 1} title="Move later">›</button>
                <button type="button" className={styles.tileRemove} onClick={() => removeItem(item.clientId)} title="Remove">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
