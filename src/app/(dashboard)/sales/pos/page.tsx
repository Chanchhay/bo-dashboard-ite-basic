"use client";

import { OrderTable } from "@/components/pos/order/order-table";
import PosButton from "@/components/pos/pos-button";
import PosCard from "@/components/pos/pos-card";
import { useGetProductsQuery, useAddProductMutation } from "@/features/order/order-api";


export default function PosScreen() {
  const { data: products = [], isLoading } = useGetProductsQuery();
  const [addProduct] = useAddProductMutation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left: product grid */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 pt-6">
          {isLoading ? (
            <div className="text-sm text-gray-400">Loading products...</div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {products.map((product) => (
                <PosCard
                  key={product.id}
                  product={product}
                  onSelect={(id) => addProduct(id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Category tabs pinned to the bottom of the product panel */}
        <PosButton />
      </div>

      {/* Right: cart / order panel */}
      <div className="w-150 shrink-0 border-l border-gray-200 bg-white">
        <OrderTable />
      </div>
    </div>
  );
}