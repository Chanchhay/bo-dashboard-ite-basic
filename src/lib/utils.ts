import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Finds the ancestor that actually scrolls `el`.
 *
 * Only `auto`/`scroll` count: the app shell is `overflow-hidden`, which still
 * scrolls programmatically but shows no scrollbar to put it back.
 */
function nearestScrollable(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;

  while (node) {
    const { overflowY } = getComputedStyle(node);
    const scrolls = overflowY === "auto" || overflowY === "scroll";

    if (scrolls && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }

  return null;
}

/**
 * Centres a form field in its own scroll container.
 *
 * `scrollIntoView` walks every scrollable ancestor, so it drags the fixed app
 * shell up along with the field and clips the sidebar and header off-screen.
 * Scrolling the one container that owns the overflow leaves the shell pinned.
 */
export function scrollFieldIntoView(fieldId: string) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  const container = nearestScrollable(field);

  if (!container) {
    field.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    const fieldBox = field.getBoundingClientRect();
    const containerBox = container.getBoundingClientRect();
    const centred =
      fieldBox.top -
      containerBox.top -
      (container.clientHeight - fieldBox.height) / 2;

    container.scrollTo({
      top: Math.max(0, container.scrollTop + centred),
      behavior: "smooth",
    });
  }

  // Keyboard focus follows the error, but the scroll above owns the movement.
  field.focus({ preventScroll: true });
}
