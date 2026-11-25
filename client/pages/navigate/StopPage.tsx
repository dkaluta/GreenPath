import { ScreenStub } from "../ScreenStub";

/** Wireframe 100:223. A placeholder until the screen is built. */
export default function StopPage() {
  return (
    <ScreenStub
      title="עצרו כאן"
      purpose="עץ בדרך שצריך אימות: מה הוא, איפה הוא ותמונה להשוואה."
      figmaNode="100:223"
      next={[
        { to: "/navigate/capture", label: "צלמו את העץ" },
        { to: "/navigate", label: "דלגו" },
      ]}
    />
  );
}
