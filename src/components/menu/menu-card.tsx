"use client";

import Image from "next/image";
import Link from "next/link";

export interface PosCardType {
  id: string | number;
  name: string;
  price: number;
  image: string;
  category: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export default function MenuCard({
  id,
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
    <Link
      href={`/menu/${id}`}
      onClick={onClick}
      className="group relative flex flex-col gap-2.5 transition-transform duration-200 hover:-translate-y-1 cursor-pointer select-none"
    >
      {/* Image Rounded Container (No outer border box, matching screenshot 100%) */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-[#1a1e29]">
        <Image
          src={image || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80"}
          alt={name}
          width={400}
          height={400}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80";
          }}
        />
      </div>

      {/* Item Details directly below image */}
      <div className="flex flex-col px-0.5">
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
          {category || "General"}
        </span>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 line-clamp-1 mt-0.5 group-hover:text-[#00932a] transition-colors">
          {name}
        </h3>
        <span className="text-base font-bold text-[#d14341] dark:text-[#f87171] mt-1">
          ${formattedPrice}
        </span>
      </div>
    </Link>
  );
}