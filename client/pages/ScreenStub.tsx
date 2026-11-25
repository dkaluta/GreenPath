import type { ReactNode } from "react";
import { Link } from "react-router";
import { t } from "../lib/i18n";
import styles from "./ScreenStub.module.css";

const FIGMA_FILE = "https://www.figma.com/design/0o5WXuCJZgpvKmoM8FypEF";

type ScreenStubProps = {
  /** The screen's words, from client/lib/i18n/strings.ts. */
  screen: { title: string; purpose: string };
  /** The wireframe frame's node id, e.g. "100:36". */
  figmaNode: string;
  /** Where the flow goes next. */
  next?: { to: string; label: string }[];
  children?: ReactNode;
};

/**
 * A placeholder for a screen that is not built yet. It names the screen,
 * links to its wireframe in Figma and to the next screens in the flow, so
 * the whole app can be clicked through from day one.
 *
 * Replace it with the real screen. The list of screens is in
 * docs/00-product.markdown.
 */
export function ScreenStub({
  screen,
  figmaNode,
  next = [],
  children,
}: ScreenStubProps) {
  const figmaUrl = `${FIGMA_FILE}?node-id=${figmaNode.replace(":", "-")}`;

  return (
    <main className={styles.screen}>
      <h1 className={styles.title}>{screen.title}</h1>
      <p>{screen.purpose}</p>
      {children}
      {next.length > 0 ? (
        <nav className={styles.next} aria-label={t.stub.next}>
          {next.map((link) => (
            <Link key={link.to} to={link.to} className={styles.nextLink}>
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
      <p className={styles.figma}>
        <a href={figmaUrl} target="_blank" rel="noreferrer">
          {t.stub.figma}
        </a>
      </p>
    </main>
  );
}
