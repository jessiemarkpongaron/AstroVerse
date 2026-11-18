import { Outlet } from 'react-router';
import { Footer } from './Footer.tsx';
import { Header } from './Header.tsx';

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
