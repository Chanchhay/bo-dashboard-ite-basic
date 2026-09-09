import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

  field.focus({ preventScroll: true });
}
