import { ScreenStub } from "../ScreenStub";

/** Wireframe 100:141. A placeholder until the screen is built. */
export default function NavigatePage() {
  return (
    <ScreenStub
      title="ניווט"
      purpose="ניווט צעד אחר צעד דרך הצל: הפנייה הבאה, הזמן שנשאר ואחוז הצל."
      figmaNode="100:141"
      next={[
        { to: "/navigate/stop", label: "עצרו כאן" },
        { to: "/navigate/report", label: "דיווח" },
        { to: "/summary", label: "סיום" },
      ]}
    />
  );
}
