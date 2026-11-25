import { ScreenStub } from "../ScreenStub";

/** Wireframe 100:275. A placeholder until the screen is built. */
export default function MatchPage() {
  return (
    <ScreenStub
      title="זה אותו עץ?"
      purpose="משווים את הצילום שלכם לתמונה של סוג העץ: כן, לא או לא בטוח."
      figmaNode="100:275"
      next={[{ to: "/navigate", label: "חזרה לניווט" }]}
    />
  );
}
