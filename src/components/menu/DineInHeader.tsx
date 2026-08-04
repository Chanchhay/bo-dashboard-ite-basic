"use client";

import { Utensils, QrCode } from "lucide-react";

type DineInHeaderProps = {
  tableNumber?: string;
  tableName?: string;
  onShowMenuQR?: () => void;
};

export default function DineInHeader({
  tableNumber = "01",
  tableName = "Dine-In Menu",
  onShowMenuQR,
}: DineInHeaderProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-6 border border-primary/20">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-md">
          <Utensils className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{tableName}</h2>
          <p className="text-xs sm:text-sm font-medium text-gray-500">Table #{tableNumber} • Dynamic POS Menu</p>
        </div>
      </div>
      {onShowMenuQR && (
        <button
          type="button"
          onClick={onShowMenuQR}
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 shadow-2xs hover:bg-gray-50 transition-colors"
        >
          <QrCode className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">Menu QR Code</span>
        </button>
      )}
    </div>
  );
}