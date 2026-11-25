import { useEffect, useId, useRef, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import styles from "./BottomSheet.module.css";

/**
 * The phone layout's bottom sheet: a card that rises from the bottom over
 * the map. Escape and a tap on the dimmed map call `onClose`.
 *
 * `variant="sheet"` touches the bottom edge (the report sheet);
 * `variant="card"` floats above it with a margin (the stop card).
 */
export function BottomSheet({
  title,
  onClose,
  variant = "sheet",
  action,
  children,
}: {
  title: string;
  onClose: () => void;
  variant?: "sheet" | "card";
  /** A button at the end of the title row, such as close. */
  action?: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sheet.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop}>
      <button
        type="button"
        className={styles.scrim}
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(styles.panel, styles[variant])}
      >
        {variant === "sheet" ? (
          <div className={styles.handle} aria-hidden="true" />
        ) : null}
        <header className={styles.header}>
          <h1 id={titleId} className={styles.title}>
            {title}
          </h1>
          {action}
        </header>
        {children}
      </div>
    </div>
  );
}
