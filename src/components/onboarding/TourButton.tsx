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
      className={`grid size-9 place-items-center rounded-full text-primary hover:bg-primary/10 transition-colors focus-visible:ring-2 focus-visible:ring-primary ${className}`}
    >
      <HelpCircle className="size-5" />
    </button>
  );
}
