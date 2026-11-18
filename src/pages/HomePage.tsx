import { useLocation, useNavigate } from 'react-router';
import { BirthForm } from '../components/BirthForm/BirthForm.tsx';
import type { BirthInput } from '../lib/astro/types.ts';
import type { ChartLocationState } from '../lib/chartState.ts';

export function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prev = (location.state as ChartLocationState | null) ?? null;

  function handleSubmit(input: BirthInput, name: string) {
    const state: ChartLocationState = { input, name };
    navigate('/chart', { state });
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Discover your Big Three</h1>
        <p className="text-slate-700 dark:text-slate-300">
          Enter your birth date, time and place to see your Sun, Moon and Rising signs and your full
          birth chart. It's free and calculated right on your phone.
        </p>
      </div>
      <BirthForm
        initial={
          prev
            ? {
                name: prev.name,
                date: prev.input.date,
                time: prev.input.time ?? '',
                accuracy: prev.input.timeAccuracy,
                place: prev.input.place,
              }
            : undefined
        }
        onSubmit={handleSubmit}
      />
    </section>
  );
}
