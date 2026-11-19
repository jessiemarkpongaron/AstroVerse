import { Link } from 'react-router';

export const DISCLAIMER =
  'For entertainment and self-reflection. Not a substitute for professional medical, legal, financial or psychological advice.';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-dusk">
      <div className="mx-auto max-w-3xl px-4 py-6 text-center text-xs text-slate-600 dark:text-slate-400">
        <p>{DISCLAIMER}</p>
        <p className="mt-2">
          <Link to="/horoscope" className="underline">
            Daily horoscope
          </Link>
          {' · '}
          <Link to="/signs" className="underline">
            Zodiac signs
          </Link>
        </p>
        <p className="mt-2">© {new Date().getFullYear()} AstroVerse · DigitalVerse Solutions</p>
      </div>
    </footer>
  );
}
