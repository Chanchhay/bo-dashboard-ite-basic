"use client";

import Image from "next/image";
import { ImageOff, Plus } from "lucide-react";
import { useState } from "react";

export interface PosCardType {
  name: string;
  price: number;
  image: string;
  category: string;
  onClick?: () => void;
}

export default function MenuCard({
  name,
  price,
  image,
  category,
  onClick,
}: PosCardType) {
  const formattedPrice =
    typeof price === "number"
      ? price.toFixed(2)
      : parseFloat(String(price) || "0").toFixed(2);

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
      />
    </div>
  );
}

function MenuCardBody({
  image,
  name,
  category,
  formattedPrice,
}: {
  image: string;
  name: string;
  category: string;
  formattedPrice: string;
}) {
  const [broken, setBroken] = useState(false);
  const showPlaceholder = !image || broken;

  return (
    <>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-[#1a1e29]">
        {showPlaceholder ? (
          <div className="flex h-full w-full items-center justify-center bg-muted/60 dark:bg-muted/30">
            <ImageOff
              className="h-auto w-2/5 max-w-20 text-muted-foreground/40"
              aria-hidden="true"
            />
            <span className="sr-only">No image for {name}</span>
          </div>
        ) : (
          <Image
            src={image}
            alt={name}
            width={400}
            height={400}
            unoptimized
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setBroken(true)}
          />
        )}
        <span className="absolute bottom-2.5 right-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary shadow-md transition-transform duration-100 group-hover:scale-110 group-active:scale-95">
          <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
        </span>
      </div>

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
