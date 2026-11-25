import { Link } from "react-router";
import { t } from "../lib/i18n";

/** Shown for any URL that doesn't match a route in client/App.tsx. */
export default function NotFoundPage() {
  return (
    <main>
      <h1>{t.notFound.title}</h1>
      <p>{t.notFound.body}</p>
      <Link to="/">{t.actions.backToMap}</Link>
    </main>
  );
}
