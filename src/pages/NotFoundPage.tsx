import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section className="space-y-4 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link to="/" className="text-gold-dark underline dark:text-gold">
        Go home
      </Link>
    </section>
  );
}
