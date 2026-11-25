import { Link, Outlet } from "react-router";
import { MapScreen } from "../features/map";
import actions from "../features/verifications/actions.module.css";
import { canNavigateHere } from "./device";
import { t } from "./i18n";

/**
 * Put routes inside this to allow them only on a phone:
 *
 *     <Route element={<RequireMobile />}>
 *       <Route path="/navigate" element={<NavigatePage />} />
 *     </Route>
 *
 * Everywhere else it shows a "continue on your phone" message instead, in
 * the map's floating panel. The rule is in client/lib/device.ts.
 */
export function RequireMobile() {
  if (canNavigateHere()) return <Outlet />;

  return (
    <MapScreen title={t.mobileOnly.title}>
      <p>{t.mobileOnly.body}</p>
      <Link to="/" className={actions.primary}>
        {t.actions.backToMap}
      </Link>
    </MapScreen>
  );
}
