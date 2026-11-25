import { t } from "../../lib/i18n";
import { ScreenStub } from "../ScreenStub";

/** Wireframe 100:321. A placeholder until the screen is built. */
export default function CollectionPage() {
  return (
    <ScreenStub
      screen={t.screens.collection}
      figmaNode="100:321"
      next={[{ to: "/", label: t.actions.backToMap }]}
    />
  );
}
