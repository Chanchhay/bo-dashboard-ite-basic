"use client";

import { HelpCircle } from "lucide-react";
import { useTourContext } from "@/lib/tours/TourContext";

export function TourButton({ className = "" }: { className?: string }) {
  const { startTour, isTourAvailable } = useTourContext();

  if (!isTourAvailable) return null;

  return (
    <button
      type="button"
      onClick={startTour}
      title="Start Page Guided Tour"
      aria-label="Start Page Guided Tour"
      className={`inline-flex shrink-0 items-center justify-center p-0.5 text-[#00932a] dark:text-[#36f928] bg-transparent border-0 outline-none hover:opacity-80 active:scale-95 transition-all cursor-pointer rounded-full focus-visible:ring-2 focus-visible:ring-primary ${className}`}
    >
      <HelpCircle className="size-5 shrink-0 stroke-[2]" />
    </button>
  );
}
