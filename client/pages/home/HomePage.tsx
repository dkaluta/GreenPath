import { ScreenStub } from "../ScreenStub";

/** Wireframe 100:36. A placeholder until the screen is built. */
export default function HomePage() {
  return (
    <ScreenStub
      title="בית"
      purpose="מפת הרחובות המוצלים סביבכם. מכאן מחפשים יעד או יוצאים להליכה חופשית."
      figmaNode="100:36"
      next={[
        { to: "/route", label: "ליעד" },
        { to: "/walk", label: "הליכה חופשית" },
        { to: "/collection", label: "האוסף שלי" },
      ]}
    />
  );
}
