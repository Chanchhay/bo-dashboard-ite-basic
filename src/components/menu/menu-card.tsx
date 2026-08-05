"use client";

import Link from "next/link";

export interface PosCardType {
  id: string | number;
  name: string;
  price: number;
  image: string;
  category: string;
  onClick?: () => void;
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
      className="group relative flex flex-col gap-3 transition-transform duration-200 hover:-translate-y-1 cursor-pointer"
    >
      {/* Image Rounded Container */}
      <div className="relative aspect-square w-full overflow-hidden rounded-[28px] bg-[#f0f0f0] p-4 flex items-center justify-center border border-gray-100 shadow-xs group-hover:shadow-md transition-shadow">
        <img
          src={image || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80"}
          alt={name}
          className="h-full w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80";
          }}
        />
      </div>

      {/* Item Details */}
      <div className="flex flex-col px-1">
        <span className="text-xs sm:text-sm font-medium text-gray-500">
          {category || "General"}
        </span>
        <h3 className="text-base sm:text-lg font-bold text-gray-900 line-clamp-1 mt-0.5">
          {name}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <span className="text-base sm:text-lg font-extrabold text-primary">
            ${formattedPrice}
          </span>
        </div>
      </div>
    </Link>
  );
}