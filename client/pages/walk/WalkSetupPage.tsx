import { ScreenStub } from "../ScreenStub";

/** Wireframe 100:74. A placeholder until the screen is built. */
export default function WalkSetupPage() {
  return (
    <ScreenStub
      title="כמה ללכת?"
      purpose="בוחרים כמה ללכת, בצעדים, במרחק או בזמן, ומקבלים מסלול מוצל עם משימות בדרך."
      figmaNode="100:74"
      next={[{ to: "/route", label: "מצאו מסלול" }]}
    />
  );
}
