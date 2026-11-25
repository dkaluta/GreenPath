import { ScreenStub } from "../ScreenStub";

/** Wireframe 100:255. A placeholder until the screen is built. */
export default function CapturePage() {
  return (
    <ScreenStub
      title="צילום"
      purpose="מצלמים את כל העץ, ואחר כך את העלים. אפשר גם לסמן שאין כאן עץ."
      figmaNode="100:255"
      next={[{ to: "/navigate/match", label: "המשך" }]}
    />
  );
}
