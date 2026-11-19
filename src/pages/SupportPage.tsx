import { Link } from 'react-router';
import { useDocumentMeta } from '../hooks/useDocumentMeta.ts';

const SUPPORT_NAME = 'AstroVerse DigitalVersePH';
const QR_SRC = '/images/gcash-qr.png';

const META = {
  title: 'Support AstroVerse',
  description:
    'AstroVerse is free. If it helped you, you can send a tip by GCash, Maya or any bank app through InstaPay QR.',
  path: '/support',
};

/** Voluntary tips via the owner's InstaPay QR (GCash, Maya, banks). Nothing is unlocked. */
export function SupportPage() {
  useDocumentMeta(META);
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Support AstroVerse</h1>
        <p className="leading-relaxed">
          Everything on AstroVerse is free, and it stays free. If it brought you a smile or a moment
          of reflection, you can send a tip of any amount. Salamat!
        </p>
      </header>

      <figure className="mx-auto max-w-xs space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-dusk">
        <img
          src={QR_SRC}
          alt={`InstaPay QR code for ${SUPPORT_NAME}`}
          width={720}
          height={720}
          className="h-auto w-full"
        />
        <figcaption className="font-semibold text-ink">{SUPPORT_NAME}</figcaption>
      </figure>

      <a
        href={QR_SRC}
        download="astroverse-gcash-qr.png"
        className="mx-auto flex min-h-11 w-full max-w-xs items-center justify-center rounded-lg bg-ink px-4 py-2 font-semibold text-white dark:bg-gold dark:text-ink"
      >
        Save QR image
      </a>

      <section aria-labelledby="how-to-pay" className="space-y-2">
        <h2 id="how-to-pay" className="text-lg font-semibold">
          How to send
        </h2>
        <p className="text-sm font-medium">On your phone</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Tap “Save QR image” (or long-press the code and save it).</li>
          <li>Open GCash and tap “Pay QR”, then “Upload QR”.</li>
          <li>Choose the saved image, enter any amount and confirm.</li>
        </ol>
        <p className="text-sm font-medium">On a computer</p>
        <p className="text-sm">Scan the code with GCash, Maya or your bank app.</p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          This is an InstaPay QR, so Maya and most bank apps work too. Check that the name shown in
          your app is {SUPPORT_NAME} before you confirm.
        </p>
      </section>

      <p className="text-xs text-slate-600 dark:text-slate-400">
        Tips are voluntary thank-yous: they don’t unlock anything, and AstroVerse never asks for
        your account details. We can’t refund tips.
      </p>

      <Link to="/" className="text-sm text-gold-dark underline dark:text-gold">
        Back to AstroVerse
      </Link>
    </div>
  );
}
