"use client";

import { cn } from "@/lib/utils";

/**
 * Ultra-Clean Skeleton Base Primitive.
 * Soft tone with smooth horizontal shimmer animation.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-[#e4e6eb]/70 dark:bg-[#252a38]",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/80 dark:before:via-white/10 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

/**
 * Product Card Skeleton: Matches real MenuCard UI 100% (Card frame, Aspect-square image, plus button, title & price).
 */
export function MenuCardSkeleton() {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#1a1e29] p-3 shadow-2xs space-y-3">
      {/* Image Skeleton with Floating Button Placeholder */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
        <Skeleton className="h-full w-full rounded-none" />
        <Skeleton className="absolute bottom-2 right-2 size-8 rounded-full" />
      </div>

      {/* Item Details Skeleton */}
      <div className="flex flex-col gap-2 pt-1 px-0.5">
        {/* Category Tag */}
        <Skeleton className="h-3 w-16 rounded-md" />
        {/* Product Title */}
        <Skeleton className="h-4.5 w-3/4 rounded-md" />
        {/* Price Line */}
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-5 w-16 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/**
 * Category Filter Skeleton: Matches exact vertical Checkbox Sidebar Filter UI 100%.
 */
export function CategoryFilterSkeleton() {
  return (
    <aside className="w-56 lg:w-64 shrink-0 font-sans space-y-6">
      <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151923] p-5 shadow-2xs space-y-6">
        {/* Header Title Skeleton */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>

        {/* Section 1: Categories Skeleton */}
        <div className="border-b border-gray-200 dark:border-gray-800 pb-6 space-y-3">
          <Skeleton className="h-3.5 w-24 rounded-sm" />
          <div className="space-y-3 pt-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-4 rounded-md shrink-0" />
                <Skeleton className={cn("h-4 rounded-md", i % 2 === 0 ? "w-28" : "w-36")} />
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Subcategories Skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-3.5 w-28 rounded-sm" />
          <div className="space-y-3 pt-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-4 rounded-md shrink-0" />
                <Skeleton className={cn("h-4 rounded-md", i % 2 === 0 ? "w-24" : "w-32")} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
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
