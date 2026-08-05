"use client";

import { X, Check, Eye, Tag, Barcode, Hash } from "lucide-react";

export type VariantOption = {
  name: string;
  value: string;
};

export type ReadOnlyVariantViewProps = {
  isOpen: boolean;
  onClose: () => void;
  itemName?: string;
  category?: string;
  price?: number;
  image?: string;
  code?: string;
  barcode?: string;
  sku?: string;
  properties?: VariantOption[];
};

export default function ReadOnlyVariantView({
  isOpen,
  onClose,
  itemName = "Item Details",
  category = "General",
  price = 0,
  image,
  code,
  barcode,
  sku,
  properties = [],
}: ReadOnlyVariantViewProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl transition-all">
        {/* Header Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid size-9 place-items-center rounded-full bg-black/10 text-gray-700 transition-colors hover:bg-black/20 hover:text-gray-900"
        >
          <X className="h-5 w-5" />
        </button>

        {/* View Only Badge Header */}
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2 border border-amber-200 text-amber-900">
          <Eye className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Static Preview — View Only Mode
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
          {/* Image */}
          <div className="relative aspect-square w-32 shrink-0 overflow-hidden rounded-2xl bg-gray-100 border border-gray-100 p-2 flex items-center justify-center">
            <img
              src={image || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80"}
              alt={itemName}
              className="h-full w-full object-contain mix-blend-multiply"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80";
              }}
            />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <Tag className="h-3 w-3" />
              {category}
            </span>
            <h3 className="text-xl font-extrabold text-gray-900 leading-snug mt-1">
              {itemName}
            </h3>
            <p className="text-2xl font-black text-[#e53e3e] mt-1.5">
              ${price.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Item Metadata */}
        <div className="mt-5 grid grid-cols-2 gap-2.5 rounded-2xl bg-gray-50 p-3.5 text-xs">
          {code && (
            <div className="flex items-center gap-1.5 text-gray-600">
              <Hash className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="font-semibold text-gray-900 truncate">Code: {code}</span>
            </div>
          )}
          {barcode && (
            <div className="flex items-center gap-1.5 text-gray-600">
              <Barcode className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="font-semibold text-gray-900 truncate">Barcode: {barcode}</span>
            </div>
          )}
          {sku && (
            <div className="flex items-center gap-1.5 text-gray-600 col-span-2">
              <span className="font-medium text-gray-400">SKU:</span>
              <span className="font-semibold text-gray-900">{sku}</span>
            </div>
          )}
        </div>

        {/* Properties & Variants */}
        <div className="mt-5 border-t border-gray-100 pt-4">
          <h4 className="text-xs font-bold tracking-wider text-gray-500 uppercase">
            Properties & Specifications
          </h4>
          {properties.length === 0 ? (
            <p className="mt-2 text-sm text-gray-400 italic">
              No custom properties defined for this item.
            </p>
          ) : (
            <div className="mt-3 space-y-2 max-h-36 overflow-y-auto pr-1">
              {properties.map((prop, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-2 text-sm"
                >
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

        {/* Action Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-white shadow-md hover:bg-primary/90 transition-all cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}