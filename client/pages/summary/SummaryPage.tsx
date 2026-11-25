import { ScreenStub } from "../ScreenStub";

/** Wireframe 100:297. A placeholder until the screen is built. */
export default function SummaryPage() {
  return (
    <ScreenStub
      title="הגעתם"
      purpose="סיכום ההליכה: מרחק, צעדים, אחוז צל ועצים שאימתתם."
      figmaNode="100:297"
      next={[
        { to: "/collection", label: "לאוסף שלי" },
        { to: "/", label: "חזרה למפה" },
      ]}
    />
  );
}
