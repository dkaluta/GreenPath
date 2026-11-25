import { ScreenStub } from "../ScreenStub";

/** Wireframe 100:181. A placeholder until the screen is built. */
export default function ReportPage() {
  return (
    <ScreenStub
      title="מה רואים כאן?"
      purpose="דיווח בזמן הליכה: עץ שלא מופיע במפה, עץ חסר או עץ פגוע."
      figmaNode="100:181"
      next={[{ to: "/navigate", label: "חזרה לניווט" }]}
    />
  );
}
