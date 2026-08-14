"use client";

import { memo } from "react";
import { ImageOff } from "lucide-react";

import { useMoney } from "@/hooks/useMoney";
import type { Item } from "@/types/pos-type";

export interface PosCardProps {
  item: Item;
  formattedPrice?: string;
  onSelect?: (item: Item) => void;
}

/**
 * One sellable item in the terminal grid.
 *
 * A real `<button>` rather than a clickable card: a cashier working by
 * keyboard has to be able to reach it, and the disabled state has to actually
 * refuse the press rather than only look dimmed.
 *
 * Sized by its grid cell instead of a fixed width, so the row stays even
 * however many columns the breakpoint gives it.
 */
const PosCardComponent = ({ item, formattedPrice, onSelect }: PosCardProps) => {
  const { format } = useMoney();
  const isDisabled = item.is_available !== "ACTIVE" || item.price === null;
  const displayPrice = formattedPrice || format(item.price);

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-label={
        isDisabled && item.unavailableReason
          ? `${item.name}, ${displayPrice}, ${item.unavailableReason}`
          : `${item.name}, ${displayPrice}`
      }
      onClick={() => onSelect?.(item)}
      style={{ touchAction: "manipulation" }}
      className={`group flex w-full select-none flex-col text-left outline-none transition-transform duration-75 focus-visible:rounded-[25px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        isDisabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer active:scale-[0.95]"
      }`}
    >
      <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[25px] border border-white bg-white transition-shadow group-hover:shadow-md group-active:border-primary/40">
        {/* Why it is dimmed. "Out of stock" needs a delivery and
            "Unavailable" needs a switch flipped in Inventory — a cashier
            cannot tell those apart from a faded card alone. */}
        {isDisabled && item.unavailableReason ? (
          <span className="absolute inset-x-0 bottom-0 z-10 bg-gray-900/75 px-2 py-1 text-center text-[11px] font-semibold text-white">
            {item.unavailableReason}
          </span>
        ) : null}
        {item.image_url ? (
          /* Decorative — the button's aria-label already names the item. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt=""
            className="h-full w-full object-cover opacity-95 group-active:scale-105 transition-transform duration-75"
          />
        ) : (
          <ImageOff className="h-8 w-8 text-gray-300" aria-hidden="true" />
        )}
      </span>

      <span className="flex w-full flex-col">
        <span className="truncate text-[15px] font-semibold leading-8 tracking-[-0.24px] text-[#636b74]">
          {item.name}
        </span>
        <span className="text-base font-bold leading-7 text-brand-red">
          {displayPrice}
        </span>
      </span>
    </button>
  );
};

export const PosCard = memo(
  PosCardComponent,
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.price === next.item.price &&
    prev.item.is_available === next.item.is_available &&
    prev.item.unavailableReason === next.item.unavailableReason &&
    prev.formattedPrice === next.formattedPrice &&
    prev.onSelect === next.onSelect,
);
export default PosCard;
