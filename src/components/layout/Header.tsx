import { Link } from 'react-router';
import { ThemeToggle } from './ThemeToggle.tsx';

export function Header() {
  return (
    <header className="border-b border-slate-200 dark:border-dusk">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span aria-hidden="true" className="text-gold-dark dark:text-gold">
            ✦
          </span>
          AstroVerse
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
