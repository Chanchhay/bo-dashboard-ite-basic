"use client";

import { useState } from "react";

const CATEGORIES = [
  "Point of Sale",
  "Order",
  "receipts",
  "Discount",
  "Modify"
];

type PosButtonType = {
  onChange?: (buttonType: string) => void;
};

export default function PosButton({ onChange }: PosButtonType) {
  const [active, setActive] = useState("Point of Sale");

  const handleSelect = (buttonType: string) => {
    setActive(buttonType);
    onChange?.(buttonType);
  };

  return (
    <div className="category-scroll sticky top-20 z-40 snap-x snap-mandatory    flex justify-center w-full gap-3 bg-background overflow-x-auto px-6 py-4">
      {CATEGORIES.map((buttonType) => {
        const isActive = buttonType === active;
        return (
          <button
            key={buttonType}
            type="button"
            onClick={() => handleSelect(buttonType)}
            className={`shrink-0 rounded-xl border px-5 py-2 text-lg font-bold transition-colors ${
              isActive
                ? "border-primary bg-primary text-white"
                : "border-primary  bg-green-200 text-primary "
            }`}
          >
            {buttonType}
          </button>
        );
      })}
    </div>
  );
}