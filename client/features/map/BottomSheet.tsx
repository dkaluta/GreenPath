import { useId, useRef, type PointerEvent, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { t } from "../../lib/i18n";
import styles from "./BottomSheet.module.css";

export type BottomSheetProps = {
  /** Shown at the top of the sheet, and read out as its name. */
  title: ReactNode;
  /** Half open (false) or nearly full height (true). */
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /** Shows a close button, and dragging down from half open calls it. */
  onClose?: () => void;
  children: ReactNode;
  className?: string;
};

/**
 * A panel that slides up from the bottom of the map, for the phone layout.
 * Not modal: the map above it still works.
 *
 *     const [expanded, setExpanded] = useState(false);
 *     {open ? (
 *       <BottomSheet
 *         title={t.screens.route.title}
 *         expanded={expanded}
 *         onExpandedChange={setExpanded}
 *         onClose={() => setOpen(false)}
 *       >
 *         ...
 *       </BottomSheet>
 *     ) : null}
 *
 * Put it inside the element that holds the map: it sits at the bottom of
 * its nearest positioned ancestor. Drag the handle, or press it, to move
 * between half and full height.
 */
export function BottomSheet({
  title,
  expanded,
  onExpandedChange,
  onClose,
  children,
  className,
}: BottomSheetProps) {
  const titleId = useId();
  const dragStart = useRef<number | null>(null);
  const dragged = useRef(false);

  const onPointerDown = (event: PointerEvent) => {
    dragStart.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerUp = (event: PointerEvent) => {
    if (dragStart.current === null) return;
    const moved = event.clientY - dragStart.current;
    dragStart.current = null;
    // A drag ends in a click too; let the click know it was a drag.
    dragged.current = Math.abs(moved) > DRAG_THRESHOLD;
    if (moved < -DRAG_THRESHOLD) onExpandedChange(true);
    else if (moved > DRAG_THRESHOLD) {
      if (expanded) onExpandedChange(false);
      else onClose?.();
    }
  };

  return (
    <section
      className={cx(styles.sheet, className)}
      data-expanded={expanded || undefined}
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className={styles.handle}
        aria-expanded={expanded}
        aria-label={expanded ? t.map.sheetCollapse : t.map.sheetExpand}
        onClick={() => {
          if (dragged.current) dragged.current = false;
          else onExpandedChange(!expanded);
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <span className={styles.grip} aria-hidden="true" />
      </button>
      <header className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {onClose ? (
          <button
            type="button"
            className={styles.close}
            aria-label={t.map.sheetClose}
            title={t.map.sheetClose}
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

/** Pixels the handle has to move before a drag counts. */
const DRAG_THRESHOLD = 30;
