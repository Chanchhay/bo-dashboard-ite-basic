"use client";

import { memo } from "react";

import { ItemImage } from "@/components/item/item-image";
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
  // Only worth saying while the item can still be sold: a dimmed card already
  // carries "Out of stock", and two stock messages at once say less than one.
  const stockLeft = isDisabled ? undefined : item.lowStockLeft;
  // Named, because the count is in the units stock is kept in and the item may
  // well be sold in something larger.
  const stockLabel =
    stockLeft === undefined
      ? undefined
      : `${stockLeft}${item.stockUnit ? ` ${item.stockUnit}` : ""} left`;

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-label={
        isDisabled && item.unavailableReason
          ? `${item.name}, ${displayPrice}, ${item.unavailableReason}`
          : stockLeft !== undefined
            ? `${item.name}, ${displayPrice}, only ${stockLabel}`
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
        {/* Discount Badge on the card image */}
        {item.discountBadge && !isDisabled && (
          <span className="absolute top-2 right-2 z-10 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm ring-1 ring-white/50">
            {item.discountBadge}
          </span>
        )}

        {/* Running out. Opposite corner from the discount badge so an item
            that is both cheap and nearly gone says both. */}
        {stockLeft !== undefined ? (
          <span className="absolute top-2 left-2 z-10 rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold text-background shadow-sm ring-1 ring-white/50">
            {stockLabel}
          </span>
        ) : null}

        {/* Why it is dimmed. "Out of stock" needs a delivery and
            "Unavailable" needs a switch flipped in Inventory — a cashier
            cannot tell those apart from a faded card alone. */}
        {isDisabled && item.unavailableReason ? (
          <span className="absolute inset-x-0 bottom-0 z-10 bg-gray-900/75 px-2 py-1 text-center text-[11px] font-semibold text-white">
            {item.unavailableReason}
          </span>
        ) : null}
        {/* Decorative — the button's aria-label already names the item. */}
        <ItemImage
          src={item.image_url}
          className="h-full w-full"
          imageClassName="opacity-95 group-active:scale-105 transition-transform duration-75"
        />
      </span>

      <span className="flex w-full flex-col">
        <span className="truncate text-[15px] font-semibold leading-8 tracking-[-0.24px] text-[#636b74]">
          {item.name}
        </span>
        <span className="flex items-baseline gap-1.5 leading-7">
          {item.discountedPrice ? (
            <>
              <span className="text-xs font-semibold text-gray-400 line-through">
                {displayPrice}
              </span>
              <span className="text-base font-bold text-brand-red">
                {item.discountedPrice}
              </span>
            </>
          ) : (
            <span className="text-base font-bold text-brand-red">
              {displayPrice}
            </span>
          )}
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
    prev.item.discountBadge === next.item.discountBadge &&
    prev.item.discountedPrice === next.item.discountedPrice &&
    prev.item.is_available === next.item.is_available &&
    prev.item.unavailableReason === next.item.unavailableReason &&
    prev.item.lowStockLeft === next.item.lowStockLeft &&
    prev.item.stockUnit === next.item.stockUnit &&
    prev.formattedPrice === next.formattedPrice &&
    prev.onSelect === next.onSelect,
);
export default PosCard;
