"use client";

import { cn } from "@/lib/utils";

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

export function CategoryFilterSkeleton() {
  return (
    <aside className="w-56 lg:w-64 shrink-0 font-sans space-y-6">
      <div className="rounded-3xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#151923] p-5 shadow-2xs space-y-6">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
          <Skeleton className="h-7 w-20 rounded-lg" />
        </div>

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

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-3 p-4">
      {/* Table Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/80 gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className={cn("h-4 rounded-md", i === 0 ? "w-36" : "w-24")} />
        ))}
      </div>
      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center justify-between py-3 border-b border-border/40 gap-4">
          <div className="flex items-center gap-3 w-44 shrink-0">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-3 w-20 rounded-md" />
            </div>
          </div>
          {Array.from({ length: cols - 1 }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn(
                "h-4 rounded-md",
                c === cols - 2 ? "w-16 rounded-full" : c % 2 === 0 ? "w-24" : "w-20"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="flex items-center justify-between pt-1">
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MetricCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-24 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
          <Skeleton className="h-7 w-28 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
