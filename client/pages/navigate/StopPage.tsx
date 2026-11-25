import { t } from "../../lib/i18n";
import { ScreenStub } from "../ScreenStub";

/** Wireframe 100:223. A placeholder until the screen is built. */
export default function StopPage() {
  return (
    <ScreenStub
      screen={t.screens.stop}
      figmaNode="100:223"
      next={[
        { to: "/navigate/capture", label: t.actions.photograph },
        { to: "/navigate", label: t.actions.skip },
      ]}
    />
  );
}
