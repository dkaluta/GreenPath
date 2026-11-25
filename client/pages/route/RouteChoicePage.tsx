import { t } from "../../lib/i18n";
import { ScreenStub } from "../ScreenStub";

/** Wireframe 100:112. A placeholder until the screen is built. */
export default function RouteChoicePage() {
  return (
    <ScreenStub
      screen={t.screens.route}
      figmaNode="100:112"
      next={[{ to: "/navigate", label: t.actions.setOff }]}
    />
  );
}
