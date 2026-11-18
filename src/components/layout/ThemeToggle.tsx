import { useTheme } from '../../hooks/useTheme.ts';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-xl hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-gold dark:hover:bg-dusk"
    >
      <span aria-hidden="true">{isDark ? '☀' : '☾'}</span>
    </button>
  );
}
