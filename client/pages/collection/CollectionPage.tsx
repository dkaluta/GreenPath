import { ScreenStub } from "../ScreenStub";

/** Wireframe 100:321. A placeholder until the screen is built. */
export default function CollectionPage() {
  return (
    <ScreenStub
      title="האוסף שלי"
      purpose="סוגי העצים שאספתם, והרחובות שעזרתם לאמת."
      figmaNode="100:321"
      next={[{ to: "/", label: "חזרה למפה" }]}
    />
  );
}
