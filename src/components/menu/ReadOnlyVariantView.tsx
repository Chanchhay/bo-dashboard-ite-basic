"use client";

import { X, Check } from "lucide-react";

type VariantOption = {
  name: string;
  value: string;
};

type ReadOnlyVariantViewProps = {
  isOpen: boolean;
  onClose: () => void;
  itemName?: string;
  price?: number;
  properties?: VariantOption[];
};

export default function ReadOnlyVariantView({
  isOpen,
  onClose,
  itemName = "Item Details",
  price = 0,
  properties = [],
}: ReadOnlyVariantViewProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-xl font-bold text-gray-900">{itemName}</h3>
        <p className="text-lg font-extrabold text-[#e53e3e] mt-1">${price.toFixed(2)}</p>

        <div className="mt-4 border-t border-gray-100 pt-4">
          <h4 className="text-xs font-bold tracking-wider text-gray-500 uppercase">Item Properties & Variants</h4>
          {properties.length === 0 ? (
            <p className="mt-2 text-sm text-gray-400 italic">No custom properties defined for this item.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {properties.map((prop, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-2.5 text-sm">
                  <span className="font-medium text-gray-600">{prop.name}</span>
                  <span className="font-semibold text-gray-900 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    {prop.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}