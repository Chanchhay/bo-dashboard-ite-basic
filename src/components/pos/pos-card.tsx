// import {
//   Card,
//   CardContent,
//   CardHeader,
//   CardTitle,

// } from "@/components/ui/card";

// export interface PosCardType {
//   name: string;
//   price: number;
//   image: string;
// }
// const PosCard = ({ name, price, image }: PosCardType) => {
//   return (
//     <Card className="w-40 pt-0">
//       <CardContent className="px-0 border border-white rounded-2xl ">
//         <img
//           src={image}
//           alt="Banner"
//           className="aspect-video h-40 rounded-2xl object-cover"
//         />
//       </CardContent>
//       <CardHeader>
//         <CardTitle className="text-gray-500 font-semibold line-clamp-1">{name}</CardTitle>
//         <CardTitle className="text-accent font-bold">${price}</CardTitle>
//       </CardHeader>
//     </Card>
//   );
// };

// export default PosCard;
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/money";
import { Product } from "@/types/pos-type";
import { ImageOff } from "lucide-react";

export interface PosCardProps {
  product: Product;
  onSelect?: (productId: string) => void;
}

const PosCard = ({ product, onSelect }: PosCardProps) => {
  const isDisabled = product.is_available !== "ACTIVE" || product.price === null;

  return (
    <Card
      onClick={() => !isDisabled && onSelect?.(product.id)}
      className={`w-40 pt-0 transition-transform ${
        isDisabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:scale-[1.02] active:scale-95"
      }`}
    >
      <CardContent className="px-0 border border-white rounded-2xl">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="aspect-video h-40 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex aspect-video h-40 items-center justify-center rounded-2xl bg-gray-100">
            <ImageOff className="h-8 w-8 text-gray-300" />
          </div>
        )}
      </CardContent>
      <CardHeader>
        <CardTitle className="text-gray-500 font-semibold line-clamp-1">
          {product.name}
        </CardTitle>
        <CardTitle className="text-accent font-bold">
          {formatCurrency(product.price)}
        </CardTitle>
      </CardHeader>
    </Card>
  );
};

export default PosCard;