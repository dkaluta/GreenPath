import { t } from "../../lib/i18n";
import { ScreenStub } from "../ScreenStub";

/** Wireframe 100:36. A placeholder until the screen is built. */
export default function HomePage() {
  return (
    <ScreenStub
      screen={t.screens.home}
      figmaNode="100:36"
      next={[
        { to: "/route", label: t.actions.toDestination },
        { to: "/walk", label: t.actions.freeWalk },
        { to: "/collection", label: t.actions.myCollection },
      ]}
    />
  );
}
