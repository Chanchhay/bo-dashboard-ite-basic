"use client";

import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { useState } from "react";

export interface PosCardType {
  id: string | number;
  name: string;
  price: number;
  image: string;
  category: string;
  onClick?: () => void;
  /**
   * False for read-only contexts (the public menu) where a click only ever
   * opens an in-place detail view via `onClick` — never a real navigation.
   * Relying on `onClick`'s `e.preventDefault()` to suppress the `<Link>`'s
   * own navigation is fragile (a background prefetch fires regardless of
   * any click at all), and on a business subdomain a prefetch/navigation
   * to `/menu/[id]` gets rewritten into a path this page never expects.
   * Defaults to true for the authenticated owner-facing "Menu" page, which
   * does want the real per-item edit link.
   */
  navigate?: boolean;
  /**
   * False on the public ("live") menu, where a shop's own item without a
   * picture must not be dressed up with a stock photo of something it does
   * not sell — a neutral placeholder is shown instead.
   */
  fallbackImage?: boolean;
}

export default function MenuCard({
  id,
  name,
  price,
  image,
  category,
  onClick,
  navigate = true,
  fallbackImage = true,
}: PosCardType) {
  const formattedPrice =
    typeof price === "number"
      ? price.toFixed(2)
      : parseFloat(String(price) || "0").toFixed(2);

  if (!navigate) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onClick?.();
        }}
        className="group relative flex flex-col gap-2.5 transition-transform duration-200 hover:-translate-y-1 cursor-pointer select-none"
      >
        <MenuCardBody
          image={image}
          name={name}
          category={category}
          formattedPrice={formattedPrice}
          fallbackImage={fallbackImage}
        />
      </div>
    );
  }

  return (
    <Link
      href={`/menu/${id}`}
      onClick={onClick}
      className="group relative flex flex-col gap-2.5 transition-transform duration-200 hover:-translate-y-1 cursor-pointer select-none"
    >
      <MenuCardBody
          image={image}
          name={name}
          category={category}
          formattedPrice={formattedPrice}
          fallbackImage={fallbackImage}
        />
    </Link>
  );
}

function MenuCardBody({
  image,
  name,
  category,
  formattedPrice,
  fallbackImage,
}: {
  image: string;
  name: string;
  category: string;
  formattedPrice: string;
  fallbackImage: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const fallbackMark = "/brand/fluxibiz-mark.png";
  const stockPhoto = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80";
  const showPlaceholder = !image || broken;

  return (
    <>
      {/* Image Rounded Container (No outer border box, matching screenshot 100%) */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-[#1a1e29]">
        {showPlaceholder ? (
          <div className="flex h-full w-full items-center justify-center bg-muted/60 dark:bg-muted/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fallbackMark}
              alt=""
              aria-hidden="true"
              className="w-2/5 max-w-20 opacity-35 dark:opacity-45"
            />
            <span className="sr-only">No image for {name}</span>
          </div>
        ) : (
          <Image
            src={image || fallbackMark}
            alt={name}
            width={400}
            height={400}
            /*
             * An item's picture can live anywhere: a shop importing its
             * catalogue keeps hosting it on whatever CDN it already used.
             * Optimising would mean fetching it through our own server, which
             * only works for hosts listed in next.config.ts — so every shop
             * would need an admin to add theirs before their photos appeared.
             * Served as-is, the browser fetches it directly and any shop's
             * pictures work the day they import them.
             */
            unoptimized
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (img.src !== stockPhoto && img.src !== location.origin + fallbackMark) {
                img.src = stockPhoto;
              } else {
                setBroken(true);
              }
            }}
          />
        )}
      </div>

      {/* Item Details directly below image */}
      <div className="flex flex-col px-0.5">
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
          {category || "General"}
        </span>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 line-clamp-1 mt-0.5 group-hover:text-primary transition-colors">
          {name}
        </h3>
        <span className="text-base font-bold text-[#d14341] dark:text-[#f87171] mt-1">
          ${formattedPrice}
        </span>
      </div>
    </>
  );
}