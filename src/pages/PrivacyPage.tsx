import { DateTime } from 'luxon';
import { Link } from 'react-router';
import { useDocumentMeta } from '../hooks/useDocumentMeta.ts';
import { aiReadingsEnabled } from '../lib/features.ts';
import { PRIVACY as privacy, PRIVACY_META, privacyPublished } from '../lib/privacy.ts';
import { NotFoundPage } from './NotFoundPage.tsx';

/** Hidden (not found) until the text is approved; tests pass includeDraft. */
export function PrivacyPage({ includeDraft = false }: { includeDraft?: boolean }) {
  useDocumentMeta(PRIVACY_META);
  if (!includeDraft && !privacyPublished()) return <NotFoundPage />;
  const ai = aiReadingsEnabled();
  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Privacy</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Last updated {DateTime.fromISO(privacy.updated).toFormat('MMMM d, yyyy')}
        </p>
        <p className="leading-relaxed">{privacy.intro}</p>
      </header>
      {privacy.sections.map((s) => {
        const items = [...s.items, ...(ai && 'aiItems' in s ? s.aiItems : [])];
        return (
          <section key={s.heading} className="space-y-2">
            <h2 className="text-lg font-semibold">{s.heading}</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
              {items.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        );
      })}
      <Link to="/" className="text-sm text-gold-dark underline dark:text-gold">
        Back to AstroVerse
      </Link>
    </article>
  );
}
