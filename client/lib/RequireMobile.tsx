import { Link, Outlet } from "react-router";
import { canNavigateHere } from "./device";

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
      <h1>הניווט זמין בטלפון</h1>
      <p>
        ניווט צעד אחר צעד עובד רק בטלפון. פתחו את המסלול הירוק בדפדפן של הטלפון
        כדי לצאת לדרך.
      </p>
      <Link to="/">חזרה למפה</Link>
    </main>
  );
}
