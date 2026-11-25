import { t } from "../../lib/i18n";
import { ScreenStub } from "../ScreenStub";

/** Wireframe 100:275. A placeholder until the screen is built. */
export default function MatchPage() {
  return (
    <ScreenStub
      screen={t.screens.match}
      figmaNode="100:275"
      next={[{ to: "/navigate", label: t.actions.backToNavigation }]}
    />
  );
}
