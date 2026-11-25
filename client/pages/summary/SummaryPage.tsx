import { t } from "../../lib/i18n";
import { ScreenStub } from "../ScreenStub";

/** Wireframe 100:297. A placeholder until the screen is built. */
export default function SummaryPage() {
  return (
    <ScreenStub
      screen={t.screens.summary}
      figmaNode="100:297"
      next={[
        { to: "/collection", label: t.actions.myCollection },
        { to: "/", label: t.actions.backToMap },
      ]}
    />
  );
}
