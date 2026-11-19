import { useState } from 'react';
import type { Chart } from '../../lib/astro/types.ts';
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  drawShareCard,
  shareCardContent,
  type CardContext,
} from '../../lib/shareCard.ts';

type Status = 'idle' | 'working' | 'shared' | 'saved' | 'failed';
const FILE_NAME = 'my-big-three.png';

function renderCard(chart: Chart): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  drawShareCard(ctx as CardContext, shareCardContent(chart));
  return canvas;
}

const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));

/**
 * Makes the Big Three image (PRD F10) on the device. Uses the phone's share sheet when it can
 * share files; otherwise downloads the PNG. Nothing is uploaded.
 */
export function ShareCardButton({ chart }: { chart: Chart }) {
  const [status, setStatus] = useState<Status>('idle');
  const [preview, setPreview] = useState<string | null>(null);

  async function onClick() {
    setStatus('working');
    const canvas = renderCard(chart);
    const blob = canvas ? await toBlob(canvas) : null;
    if (!canvas || !blob) {
      setStatus('failed');
      return;
    }
    setPreview(canvas.toDataURL('image/png'));
    const file = new File([blob], FILE_NAME, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'My Big Three' });
        setStatus('shared');
      } catch (e) {
        // Closing the share sheet is not an error; the preview stays for a long-press save.
        setStatus(e instanceof DOMException && e.name === 'AbortError' ? 'idle' : 'failed');
      }
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = FILE_NAME;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('saved');
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={status === 'working'}
        className="min-h-11 w-full rounded-lg border border-gold px-4 py-2 font-semibold text-gold-dark sm:w-auto dark:text-gold"
      >
        Share my Big Three image
      </button>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        The image shows your signs only: no name, birth date, time or place.
      </p>
      <p role="status" aria-live="polite" className="text-sm">
        {status === 'saved' && 'Image saved to your downloads.'}
        {status === 'shared' && 'Shared!'}
        {status === 'failed' &&
          'Couldn’t make the image on this device. Try a screenshot of your Big Three instead.'}
      </p>
      {preview && (
        <img
          src={preview}
          alt="Your Big Three image"
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          className="h-auto w-48 rounded-xl border border-slate-200 dark:border-dusk"
        />
      )}
    </div>
  );
}
