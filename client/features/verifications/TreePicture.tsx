import { cx } from "../../lib/cx";
import { TreeIcon } from "./icons";
import styles from "./TreePicture.module.css";

/**
 * A square picture of a tree: the photo if there is one, otherwise the
 * grey placeholder with the tree marker, as in the wireframes.
 */
export function TreePicture({
  src,
  alt,
  size = "md",
  className,
}: {
  src?: string | null;
  /** Describe the picture. Empty when the text next to it already does. */
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cx(styles.picture, styles[size], className)}>
      {src ? (
        <img src={src} alt={alt} className={styles.image} />
      ) : (
        <TreeIcon
          size={size === "lg" ? 48 : 28}
          className={styles.placeholder}
          role={alt ? "img" : undefined}
          aria-label={alt || undefined}
          aria-hidden={alt ? undefined : true}
        />
      )}
    </div>
  );
}
