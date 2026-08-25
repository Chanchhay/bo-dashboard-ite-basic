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
  sizeOptions = [10, 25, 50, 100],
  itemLabel = "item",
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
        "flex flex-col gap-3 border-t border-border bg-card px-4 py-3.5 sm:px-6",
        "sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {/* Left: rows per page */}
      <div className="flex items-center gap-2.5">
        <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
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
          <SelectTrigger className="h-9 w-[4.5rem] rounded-xl border border-border bg-card px-3 text-xs sm:text-sm font-bold text-foreground shadow-2xs hover:bg-muted/40 transition-colors cursor-pointer">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sizeOptions.map((option) => (
              <SelectItem key={option} value={String(option)} className="font-semibold text-xs sm:text-sm">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Right: range readout and page stepper */}
      <div className="flex items-center gap-3 sm:gap-5">
        <span className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
          <span className="font-bold text-foreground">
            {firstRow}
            {lastRow > firstRow ? `\u2013${lastRow}` : ""}
          </span>{" "}
          of <span className="font-bold text-foreground">{totalElements}</span>{" "}
          {noun}
        </span>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="h-8 w-8 rounded-full border border-border/80 bg-card hover:bg-muted/60 text-foreground transition-all cursor-pointer shadow-2xs disabled:opacity-30"
            aria-label="Previous page"
            disabled={!canGoBack}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-xs sm:text-sm font-bold whitespace-nowrap text-foreground">
            Page {currentPage + 1} of {safeTotalPages}
          </span>

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="h-8 w-8 rounded-full border border-border/80 bg-card hover:bg-muted/60 text-foreground transition-all cursor-pointer shadow-2xs disabled:opacity-30"
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
