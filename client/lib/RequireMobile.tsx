import { Link, Outlet } from "react-router";
import { canNavigateHere } from "./device";
import { t } from "./i18n";

/**
 * Put routes inside this to allow them only on a phone:
 *
 *     <Route element={<RequireMobile />}>
 *       <Route path="/navigate" element={<NavigatePage />} />
 *     </Route>
 *
 * Everywhere else it shows a "continue on your phone" message instead. The
 * rule is in client/lib/device.ts.
 */
export function RequireMobile() {
  if (canNavigateHere()) return <Outlet />;

  return (
    <main>
      <h1>{t.mobileOnly.title}</h1>
      <p>{t.mobileOnly.body}</p>
      <Link to="/">{t.actions.backToMap}</Link>
    </main>
  );
}
