import { t } from "../../lib/i18n";
import { ScreenStub } from "../ScreenStub";

/** Wireframe 100:255. A placeholder until the screen is built. */
export default function CapturePage() {
  return (
    <ScreenStub
      screen={t.screens.capture}
      figmaNode="100:255"
      next={[{ to: "/navigate/match", label: t.actions.continue }]}
    />
  );
}
