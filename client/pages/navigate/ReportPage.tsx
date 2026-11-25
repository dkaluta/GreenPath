import { t } from "../../lib/i18n";
import { ScreenStub } from "../ScreenStub";

/** Wireframe 100:181. A placeholder until the screen is built. */
export default function ReportPage() {
  return (
    <ScreenStub
      screen={t.screens.report}
      figmaNode="100:181"
      next={[{ to: "/navigate", label: t.actions.backToNavigation }]}
    />
  );
}
