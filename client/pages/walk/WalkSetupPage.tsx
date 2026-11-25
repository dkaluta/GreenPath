import { t } from "../../lib/i18n";
import { ScreenStub } from "../ScreenStub";

/** Wireframe 100:74. A placeholder until the screen is built. */
export default function WalkSetupPage() {
  return (
    <ScreenStub
      screen={t.screens.walk}
      figmaNode="100:74"
      next={[{ to: "/route", label: t.actions.findRoute }]}
    />
  );
}
