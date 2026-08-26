"use client";

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';

export function PosProductList({ onAddToCart }: { onAddToCart: (product: any) => void }) {
  // Automatically pull products from IndexedDB (UI updates instantly when stock is deducted)
  const products = useLiveQuery(() => db.products.toArray());

  if (!products) return <div className="p-4 text-gray-500">Loading Catalog...</div>;

  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      {products.map((product) => (
        <button
          key={product.id}
          disabled={product.stock_quantity <= 0}
          onClick={() => onAddToCart(product)}
          className="p-4 border rounded shadow hover:bg-gray-50 disabled:opacity-50 text-left transition-colors"
        >
          <div className="font-bold text-gray-900">{product.name}</div>
          <div className="text-sm text-gray-600">${product.price}</div>
          <div className={`text-xs font-semibold ${product.stock_quantity <= 0 ? 'text-red-500' : 'text-green-600'}`}>
            Stock: {product.stock_quantity}
          </div>
        </button>
      ))}
    </div>
  );
}
