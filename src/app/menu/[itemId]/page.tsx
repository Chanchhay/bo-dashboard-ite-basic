"use client";

import { useMoney } from "@/hooks/useMoney";

import { use, useState } from "react";
import Link from "next/link";
import StoreProvider from "@/app/StoreProvider";
import { useGetChannelItemsQuery } from "@/services/salesChannelApi";
import { attributeIcon } from "@/lib/api/attribute-icons";
import type { InventoryItem } from "@/lib/api/inventory";
import { ArrowLeft, Tag, ImageOff, Check } from "lucide-react";
import { ProductDetailSkeleton } from "@/components/ui/skeleton";

function FullProductItemContent({ itemId }: { itemId: string }) {
  const { format: formatMoney } = useMoney();
  const { data: channelItems = [], isLoading } = useGetChannelItemsQuery("POS");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const matchedEntry = channelItems.find(
    (entry) =>
      entry.item.id === itemId ||
      entry.item.code === itemId ||
      entry.item.sku === itemId
  );

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (!matchedEntry) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900">Product Not Found</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          The item you are looking for is no longer available in the POS menu.
        </p>
        <Link
          href="/menu"
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-primary/90 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Menu
        </Link>
      </div>
    );
  }

  const rawItem = matchedEntry.item as unknown as InventoryItem;
  const gallery = [...(rawItem.images || [])]
    .sort((a, b) => (a.position || 0) - (b.position || 0))
    .map((img) => img.url)
    .filter(Boolean) as string[];

  const activeImage =
    gallery[selectedImageIndex] ||
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80";

  const price = rawItem.price ?? 0;
  const categoryName = rawItem.itemGroup?.name || "General";
  const attributes = rawItem.attributes || [];
  const specs = attributes.filter((attr) => attr.placement === "SPECIFICATION");

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0f1219] text-gray-900 dark:text-gray-100 font-sans flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#12151e]/80 backdrop-blur-md px-4 sm:px-8 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200 hover:text-primary dark:hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Catalog
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-8 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start bg-white dark:bg-[#1a1e29] p-6 sm:p-10 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs">
          {/* Gallery */}
          <div className="flex flex-col gap-4">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-gray-50 dark:bg-[#12151e] border border-gray-100 dark:border-gray-800 flex items-center justify-center">
              <img
                src={activeImage}
                alt={rawItem.name ?? "Product image"}
                className="h-full w-full object-cover transition-all duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80";
                }}
              />
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {gallery.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-xl border-2 p-1 transition-all ${
                      idx === selectedImageIndex
                        ? "border-primary bg-primary/5 dark:bg-primary/20"
                        : "border-transparent bg-gray-100 dark:bg-gray-800 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Thumbnail ${idx + 1}`}
                      className="h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col gap-5">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                <Tag className="h-3.5 w-3.5" />
                {categoryName}
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 mt-2">
                {rawItem.name}
              </h1>
              <p className="text-3xl font-black text-[#d14341] dark:text-[#f87171] mt-3">
                {formatMoney(price)}
              </p>
            </div>

            {rawItem.description ? (
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Description
                </h3>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {rawItem.description}
                </p>
              </div>
            ) : null}

            {/* Specifications & Properties */}
            {specs.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Specifications
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {specs.map((spec, idx) => {
                    const Glyph = attributeIcon(spec.icon);
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 rounded-2xl bg-gray-50 dark:bg-[#12151e] p-3 text-xs"
                      >
                        <Glyph className="h-4 w-4 text-primary dark:text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-gray-100 block">
                            {spec.name}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {spec.values?.[0]?.value || "—"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Link
                href="/menu"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-primary py-3.5 text-sm font-bold text-white shadow-md hover:bg-primary/90 transition-all"
              >
                Return to Full Menu Catalog
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function FullProductPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const resolvedParams = use(params);

  return (
    <StoreProvider>
      <FullProductItemContent itemId={resolvedParams.itemId} />
    </StoreProvider>
  );
}
