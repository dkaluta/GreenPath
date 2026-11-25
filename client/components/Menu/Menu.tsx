import { Menu as BaseMenu } from "@base-ui/react/menu";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import { cx, type PlainClassName } from "../../lib/cx";
import styles from "./Menu.module.css";

export type MenuProps = PlainClassName<
  Omit<ComponentProps<typeof BaseMenu.Root>, "children">
> & {
  trigger: ReactElement;
  /** Use <Menu.Item> and <Menu.Separator> inside. */
  children: ReactNode;
};

/**
 * A list of actions that drops down from a button.
 *
 *     <Menu trigger={<Button variant="secondary">Actions</Button>}>
 *       <Menu.Item onClick={edit}>Edit</Menu.Item>
 *       <Menu.Separator />
 *       <Menu.Item onClick={remove}>Delete</Menu.Item>
 *     </Menu>
 *
 * Arrow keys move between items, Escape closes, and typing jumps to an
 * item - all handled by Base UI.
 */
export function Menu({ trigger, children, className, ...props }: MenuProps) {
  return (
    <BaseMenu.Root {...props}>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner
          sideOffset={4}
          align="start"
          className={styles.positioner}
        >
          <BaseMenu.Popup className={cx(styles.popup, className)}>
            {children}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}

export type MenuItemProps = PlainClassName<
  ComponentProps<typeof BaseMenu.Item>
> & {
  /** Styles it as a destructive action. */
  destructive?: boolean;
};

function Item({ destructive, className, ...props }: MenuItemProps) {
  return (
    <BaseMenu.Item
      className={cx(styles.item, destructive && styles.destructive, className)}
      {...props}
    />
  );
}

function MenuSeparator({
  className,
  ...props
}: PlainClassName<ComponentProps<typeof BaseMenu.Separator>>) {
  return (
    <BaseMenu.Separator
      className={cx(styles.separator, className)}
      {...props}
    />
  );
}

/**
 * A set of choices where exactly one is on, such as a theme:
 *
 *     <Menu.Group label="Theme">
 *       <Menu.RadioGroup value={theme} onValueChange={setTheme}>
 *         <Menu.RadioItem value="light">Light</Menu.RadioItem>
 *         <Menu.RadioItem value="dark">Dark</Menu.RadioItem>
 *       </Menu.RadioGroup>
 *     </Menu.Group>
 *
 * The chosen item shows a check at its start.
 */
function RadioGroup(props: ComponentProps<typeof BaseMenu.RadioGroup>) {
  return <BaseMenu.RadioGroup {...props} />;
}

function RadioItem({
  className,
  children,
  ...props
}: PlainClassName<ComponentProps<typeof BaseMenu.RadioItem>>) {
  return (
    <BaseMenu.RadioItem className={cx(styles.item, className)} {...props}>
      <span className={styles.indicator}>
        <BaseMenu.RadioItemIndicator>
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </BaseMenu.RadioItemIndicator>
      </span>
      {children}
    </BaseMenu.RadioItem>
  );
}

/** Items under a small heading. */
function Group({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <BaseMenu.Group>
      <BaseMenu.GroupLabel className={styles.groupLabel}>
        {label}
      </BaseMenu.GroupLabel>
      {children}
    </BaseMenu.Group>
  );
}

Menu.Item = Item;
Menu.Separator = MenuSeparator;
Menu.Group = Group;
Menu.RadioGroup = RadioGroup;
Menu.RadioItem = RadioItem;
