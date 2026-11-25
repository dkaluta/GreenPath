import { t } from "../../lib/i18n";
import { ScreenStub } from "../ScreenStub";

/** Wireframe 100:141. A placeholder until the screen is built. */
export default function NavigatePage() {
  return (
    <ScreenStub
      screen={t.screens.navigate}
      figmaNode="100:141"
      next={[
        { to: "/navigate/stop", label: t.actions.stopHere },
        { to: "/navigate/report", label: t.actions.report },
        { to: "/summary", label: t.actions.finish },
      ]}
    />
  );
}
