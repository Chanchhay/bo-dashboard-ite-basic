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
        "flex flex-col gap-3 border-t border-border bg-card px-4 py-3",
        "sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {/* Left: rows per page */}
      <div className="flex items-center gap-2.5">
        <span className="text-sm text-description whitespace-nowrap">
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
          <SelectTrigger className="h-9 w-[4.5rem] rounded-xl border-border bg-card px-3 text-sm font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sizeOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Right: range readout and page stepper */}
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="text-sm text-description whitespace-nowrap">
          <span className="font-semibold text-primary">
            {firstRow}
            {lastRow > firstRow ? `\u2013${lastRow}` : ""}
          </span>{" "}
          of <span className="font-semibold text-primary">{totalElements}</span>{" "}
          {noun}
        </span>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="rounded-full"
            aria-label="Previous page"
            disabled={!canGoBack}
            onClick={() => onPageChange(currentPage - 1)}
          >
            <ChevronLeft />
          </Button>

          <span className="text-sm font-semibold whitespace-nowrap text-text">
            Page {currentPage + 1} of {safeTotalPages}
          </span>

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="rounded-full"
            aria-label="Next page"
            disabled={!canGoForward}
            onClick={() => onPageChange(currentPage + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PaginationBar;
