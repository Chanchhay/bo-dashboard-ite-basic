"use client";

/**
 * The terminal's tab bar.
 *
 * Controlled rather than self-managing: the screen switches tabs on its own
 * after a payment, and a bar holding its own idea of "active" would keep
 * highlighting a tab you are no longer on.
 */

export const POS_TABS = [
  { label: "Point of Sale" },
  { label: "Order" },
  { label: "Receipts" },
  // No screens behind these yet. Shown disabled rather than hidden so the
  // shape of the terminal stays honest about what is still coming.
  { label: "Discount" },
  { label: "Modify", disabled: true },
] as const;

export type PosTab = (typeof POS_TABS)[number]["label"];

type PosButtonType = {
  active: PosTab;
  onChange?: (tab: PosTab) => void;
  activeDiscountLabel?: string | null;
};

export default function PosButton({ active, onChange }: PosButtonType) {
  return (
    <div
      role="tablist"
      aria-label="Terminal sections"
      data-tour="pos-tab-bar"
      className="scrollbar-none w-full shrink-0 overflow-x-auto bg-[#f5f5f5] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-4 min-[1025px]:px-[27px] min-[1025px]:pb-[25px] min-[1025px]:pt-[9px]"
    >
      <div className="mx-auto flex w-max gap-2 min-[1025px]:mx-0 min-[1025px]:gap-[15px]">
        {POS_TABS.map((tab) => {
          const isActive = tab.label === active;
          const isDisabled = "disabled" in tab && tab.disabled;
          const tourKey = `pos-tab-${tab.label.toLowerCase().replace(/\s+/g, "-")}`;

          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              data-tour={tourKey}
              aria-selected={isActive}
              disabled={isDisabled}
              title={isDisabled ? "Coming soon" : undefined}
              onClick={() => onChange?.(tab.label)}
              className={`h-11 shrink-0 rounded-xl border px-4 text-sm font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:px-5 sm:text-base min-[1025px]:h-[55px] min-[1025px]:min-w-[130px] min-[1025px]:rounded-[14px] min-[1025px]:text-xl ${
                isDisabled
                  ? "cursor-not-allowed border-primary bg-primary/20 text-primary"
                  : isActive
                    ? "border-primary bg-primary text-white"
                    : "border-primary bg-primary/20 text-primary hover:bg-primary/30"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
