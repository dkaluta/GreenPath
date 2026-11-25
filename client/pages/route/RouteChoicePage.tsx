import { ScreenStub } from "../ScreenStub";

/** Wireframe 100:112. A placeholder until the screen is built. */
export default function RouteChoicePage() {
  return (
    <ScreenStub
      title="בחירת מסלול"
      purpose="כמה מסלולים ליעד, לכל אחד זמן ואחוז צל. הכי מוצל מופיע ראשון."
      figmaNode="100:112"
      next={[{ to: "/navigate", label: "יוצאים לדרך" }]}
    />
  );
}
