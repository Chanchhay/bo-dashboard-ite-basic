"use client";

import { cn } from "@/lib/utils";

/**
 * Facebook-grade Ultra-Clean Skeleton Base Primitive.
 * Uses uniform soft gray tone (#e4e6eb in light, #252833 in dark)
 * with a silky smooth horizontal shimmer wave animation.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-[#f0f2f5] dark:bg-[#252a38]",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/80 dark:before:via-white/10 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

/**
 * Product Card Skeleton: Clean, borderless, uniform soft shapes matching Facebook UI style.
 */
export function MenuCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {/* Square Image Container Skeleton */}
      <Skeleton className="aspect-square w-full rounded-xl sm:rounded-2xl" />

      {/* Item Details Skeleton */}
      <div className="flex flex-col gap-2 px-1">
        {/* Category Line Skeleton */}
        <Skeleton className="h-3.5 w-16 rounded-full" />
        
        {/* Product Title Skeleton */}
        <Skeleton className="h-4.5 w-4/5 rounded-md" />
        
        {/* Price Skeleton */}
        <div className="pt-0.5">
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/**
 * Category Filter Skeleton: Clean, solid capsule shapes matching Facebook top bar style.
 */
export function CategoryFilterSkeleton() {
  const pillWidths = ["w-28", "w-24", "w-32", "w-20", "w-26", "w-22", "w-30"];

  return (
    <div className="category-scroll snap-x snap-mandatory flex w-full items-center justify-start gap-3 overflow-x-auto py-2.5 px-1 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {pillWidths.map((w, idx) => (
        <Skeleton
          key={idx}
          className={cn("h-9 shrink-0 rounded-full", w)}
        />
      ))}
    </div>
  );
}

/**
 * Product Detail Skeleton: Clean layout for individual item page.
 */
export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0f1219] text-gray-900 dark:text-gray-100 font-sans flex flex-col transition-colors duration-200">
      <header className="sticky top-0 z-20 border-b border-gray-200/60 dark:border-gray-800 bg-white/80 dark:bg-[#12151e]/80 backdrop-blur-md px-4 sm:px-8 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Skeleton className="h-6 w-32 rounded-lg" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-8 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start bg-white dark:bg-[#1a1e29] p-6 sm:p-10 rounded-3xl border border-gray-100/60 dark:border-gray-800 shadow-xs">
          <div className="flex flex-col gap-4">
            <Skeleton className="aspect-square w-full rounded-2xl sm:rounded-3xl" />
          </div>
          <div className="flex flex-col gap-5">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-9 w-3/4 rounded-xl" />
            <Skeleton className="h-8 w-32 rounded-lg" />
            <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Skeleton className="h-4 w-full rounded-full" />
              <Skeleton className="h-4 w-5/6 rounded-full" />
              <Skeleton className="h-4 w-2/3 rounded-full" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Form Skeleton: Clean layout for form components.
 */
export function FormSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-[24px] bg-card border border-gray-200/60 dark:border-[#242937] p-6 lg:p-7 shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
