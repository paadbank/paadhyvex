'use client';

import { useState } from 'react';
import { mediaUrl } from '@/lib/format';
import type { StoryMedia } from '@/lib/types';
import { AlertIcon, BackChevronIcon, ChevronIcon, ImageIcon, PlayIcon } from '@/components/ui/icons';
import styles from './stories.module.css';

/**
 * A still of a story's first media. A video shows its own first frame (`#t=0.1` asks the browser for
 * it from the metadata alone), which needs no canvas and no download of the whole file.
 */
export function StoryThumb({ media, title }: { media?: StoryMedia; title: string }) {
  const [failed, setFailed] = useState(false);
  const url = media ? mediaUrl(media) : null;
  if (!media || !url || failed) {
    return <div className={styles.thumbEmpty}>{media?.provider === 'failed' || failed ? <AlertIcon size="24px" /> : <ImageIcon size="24px" />}</div>;
  }
  if (media.type === 'video') {
    return (
      <>
        <video className={styles.thumb} src={`${url}#t=0.1`} preload="metadata" muted playsInline onError={() => setFailed(true)} aria-label={title} />
        <span className={styles.play}><PlayIcon size="18px" /></span>
      </>
    );
  }
  return <img className={styles.thumb} src={url} alt={title} loading="lazy" onError={() => setFailed(true)} />;
}

/** A story's photos and videos, one at a time. */
export function MediaCarousel({ media, title }: { media: StoryMedia[]; title: string }) {
  const [index, setIndex] = useState(0);

  if (media.length === 0) return null;
  const current = media[index] ?? media[0];
  const url = mediaUrl(current);

  return (
    <div className={styles.carousel}>
      {!url ? (
        <div className={styles.thumbEmpty}>{current.provider === 'failed' ? <><AlertIcon size="24px" /> This media could not be loaded</> : <ImageIcon size="24px" />}</div>
      ) : current.type === 'video' ? (
        <video key={current.id} src={`${url}#t=0.1`} controls playsInline preload="metadata" />
      ) : (
        <img key={current.id} src={url} alt={title} />
      )}
      {media.length > 1 && (
        <div className={styles.carouselBar}>
          <button type="button" aria-label="Previous photo or video" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}><BackChevronIcon size="20px" /></button>
          <span>{index + 1} of {media.length}</span>
          <button type="button" aria-label="Next photo or video" disabled={index === media.length - 1} onClick={() => setIndex((i) => i + 1)}><ChevronIcon size="20px" /></button>
        </div>
      )}
    </div>
  );
}
