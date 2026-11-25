import { Link } from "react-router";
import { MapScreen } from "../features/map";
import actions from "../features/verifications/actions.module.css";
import { t } from "../lib/i18n";

/**
 * Shown for any URL that doesn't match a route in client/App.tsx: a panel
 * (desktop) or sheet (phone) over the map, with the way back to it.
 */
export default function NotFoundPage() {
  return (
    <MapScreen title={t.notFound.title}>
      <p>{t.notFound.body}</p>
      <Link to="/" className={actions.primary}>
        {t.actions.backToMap}
      </Link>
    </MapScreen>
  );
}
