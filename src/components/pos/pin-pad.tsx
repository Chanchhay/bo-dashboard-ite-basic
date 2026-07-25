"use client";

import { ArrowLeft, Delete } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export function PinPad() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDigit = (digit: number) => {
    if (pin.length >= 6) return;
    setPin((prev) => prev + digit.toString());
    setError("");
  };
  const handleDelete = () => setPin((prev) => prev.slice(0, -1));
  const handleClear = () => {
    setPin("");
    setError("");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f4f4f5] p-6">
      <div className="flex w-full max-w-[360px] flex-col items-center gap-5 rounded-3xl bg-white p-15 shadow-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-1 pt-2">
          <h1 className="text-2xl font-extrabold tracking-tight">
            <span >Fluxi</span>
            <span className="text-primary">Biz</span>
          </h1>
          <p className="text-sm text-gray-500">Enter your PIN code</p>
        </div>

        {/* PIN dots */}
        <div className="flex gap-2.5">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className={`h-4 w-4 rounded-full border-[1.5px] transition-all duration-150 ${
                i < pin.length
                  ? "bg-primary border-gray-400"
                  : "bg-transparent border-gray-400"
              }`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-500 text-center min-h-[16px]">
            {error}
          </p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {Array.from({ length: 9 }, (_, i) => (
            <button
              key={i + 1}
              type="button"
              onClick={() => handleDigit(i + 1)}
              disabled={loading}
              className="flex h-16 items-center justify-center rounded-lg border border-gray-200 bg-white text-2xl font-semibold text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-transform active:scale-95 active:bg-gray-50 disabled:opacity-40"
            >
              {i + 1}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="h-16 rounded-lg bg-[#16a34a] text-lg font-bold text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-transform active:scale-95 active:bg-[#15803d] disabled:opacity-40"
          >
            C
          </button>

          <button
            type="button"
            onClick={() => handleDigit(0)}
            disabled={loading}
            className="flex h-16 items-center justify-center rounded-lg border border-gray-200 bg-white text-2xl font-semibold text-gray-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-transform active:scale-95 active:bg-gray-50 disabled:opacity-40"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex h-16 items-center justify-center rounded-lg bg-[#dc2626] text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-transform active:scale-95 active:bg-[#b91c1c] disabled:opacity-40"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        {/* Footer links */}
        <Link
          href={""}
          className="text-sm text-gray-500 hover:text-gray-700 pt-1"
        >
          Try another way?
        </Link>
        <Link
          href={""}
          className="flex items-center justify-center gap-1 text-sm text-blue-500 hover:text-blue-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>
    </div>
  );
}