"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type PaginationBarProps = {
  /** Zero-based index of the current page. */
  page: number;
  /** Rows requested per page. */
  size: number;
  /** Total rows across every page, from `page.totalElements`. */
  totalElements: number;
  /** Total page count, from `page.totalPages`. */
  totalPages: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
  /** Dims the controls and blocks input while a fetch is in flight. */
  isLoading?: boolean;
  /** Choices in the left dropdown. */
  sizeOptions?: number[];
  /** Noun for the row count, e.g. "customer" gives "1–10 of 42 customers". */
  itemLabel?: string;
  itemLabelPlural?: string;
  className?: string;
};

export function PaginationBar({
  page,
  size,
  totalElements,
  totalPages,
  onPageChange,
  onSizeChange,
  isLoading = false,
  sizeOptions = [10, 20, 25, 50, 100],
  itemLabel = "row",
  itemLabelPlural,
  className,
}: PaginationBarProps) {
  const safeTotalPages = Math.max(totalPages, 1);
  const currentPage = Math.min(Math.max(page, 0), safeTotalPages - 1);

  const firstRow = totalElements === 0 ? 0 : currentPage * size + 1;
  const lastRow = Math.min((currentPage + 1) * size, totalElements);

  const plural = itemLabelPlural ?? `${itemLabel}s`;
  const noun = totalElements === 1 ? itemLabel : plural;

  const canGoBack = currentPage > 0 && !isLoading;
  const canGoForward = currentPage + 1 < safeTotalPages && !isLoading;

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3 border-t border-border bg-card px-4 py-3 sm:px-6",
        "sm:flex-row sm:items-center sm:justify-between transition-all duration-200",
        className,
      )}
    >
      {/* Left: rows per page */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <span className="text-xs sm:text-sm font-normal text-muted-foreground whitespace-nowrap">
          Items per page
        </span>
        <Select
          value={String(size)}
          onValueChange={(value) => {
            onSizeChange(Number(value));
            onPageChange(0);
          }}
          disabled={isLoading}
        >
          <SelectTrigger className="h-8 sm:h-9 w-auto min-w-[4.25rem] rounded-xl border border-border/90 bg-card px-3 text-xs sm:text-sm font-bold text-foreground shadow-2xs hover:bg-muted/40 transition-colors cursor-pointer gap-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" className="min-w-[4.5rem]">
            {sizeOptions.map((option) => (
              <SelectItem
                key={option}
                value={String(option)}
                className="font-semibold text-xs sm:text-sm cursor-pointer"
              >
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Right: range readout and page stepper */}
      <div className="flex items-center gap-4 sm:gap-6">
        <span className="text-xs sm:text-sm font-normal text-muted-foreground whitespace-nowrap">
          <span className="font-semibold text-foreground">
            {firstRow}
            {lastRow > firstRow ? `\u2013${lastRow}` : ""}
          </span>{" "}
          of <span className="font-bold text-foreground">{totalElements}</span>{" "}
          {noun}
        </span>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border border-border/80 bg-card hover:bg-muted/60 text-muted-foreground hover:text-foreground active:scale-90 transition-all duration-150 cursor-pointer shadow-2xs disabled:opacity-30 disabled:pointer-events-none disabled:active:scale-100"
            aria-label="Previous page"
            disabled={!canGoBack}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-xs sm:text-sm font-bold whitespace-nowrap text-foreground tracking-tight select-none">
            Page {currentPage + 1} of {safeTotalPages}
          </span>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border border-border/80 bg-card hover:bg-muted/60 text-muted-foreground hover:text-foreground active:scale-90 transition-all duration-150 cursor-pointer shadow-2xs disabled:opacity-30 disabled:pointer-events-none disabled:active:scale-100"
            aria-label="Next page"
            disabled={!canGoForward}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PaginationBar;
