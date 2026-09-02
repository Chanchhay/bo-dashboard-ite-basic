"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";


function getPageItems(currentPage: number, totalPages: number): (number | null)[] {
  const siblingCount = 1;
  const totalVisible = siblingCount * 2 + 5;

  if (totalPages <= totalVisible) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const leftSibling = Math.max(currentPage - siblingCount, 0);
  const rightSibling = Math.min(currentPage + siblingCount, totalPages - 1);

  const showLeftEllipsis = leftSibling > 1;
  const showRightEllipsis = rightSibling < totalPages - 2;

  const items: (number | null)[] = [0];

  if (showLeftEllipsis) {
    items.push(null);
  } else {
    for (let p = 1; p < leftSibling; p++) items.push(p);
  }

  for (let p = leftSibling; p <= rightSibling; p++) {
    if (p !== 0 && p !== totalPages - 1) items.push(p);
  }

  if (showRightEllipsis) {
    items.push(null);
  } else {
    for (let p = rightSibling + 1; p < totalPages - 1; p++) items.push(p);
  }

  items.push(totalPages - 1);

  return items;
}

export type PaginationBarProps = {

  page: number;

  size: number;

  totalElements: number;

  totalPages: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;

  isLoading?: boolean;

  sizeOptions?: number[];

  itemLabel?: string;
  itemLabelPlural?: string;
  className?: string;

  /**
   * How many rows the pages before this one held, and how many this one is
   * showing, where that is not simply `page * size`.
   *
   * A list that pins rows to its first page — unsynced sales waiting to reach
   * the server — has a first page longer than the rest, and the running count
   * has to say so rather than working it out from arithmetic that no longer
   * holds. Left out, the bar counts the usual way.
   */
  rowsBefore?: number;
  rowsOnPage?: number;
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
  rowsBefore,
  rowsOnPage,
}: PaginationBarProps) {
  const safeTotalPages = Math.max(totalPages, 1);
  const currentPage = Math.min(Math.max(page, 0), safeTotalPages - 1);

  const before = rowsBefore ?? currentPage * size;
  const firstRow = totalElements === 0 ? 0 : before + 1;
  const lastRow =
    rowsOnPage === undefined
      ? Math.min((currentPage + 1) * size, totalElements)
      : before + rowsOnPage;

  const plural = itemLabelPlural ?? `${itemLabel}s`;
  const noun = totalElements === 1 ? itemLabel : plural;

  const canGoBack = currentPage > 0 && !isLoading;
  const canGoForward = currentPage + 1 < safeTotalPages && !isLoading;

  const pageItems = getPageItems(currentPage, safeTotalPages);

  const navButtonClass =
    "h-7 w-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:pointer-events-none disabled:active:scale-100 [&_svg]:h-3.5 [&_svg]:w-3.5";

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-3 border-t border-border bg-card px-3.5 py-3 sm:px-6",
        "sm:flex-row sm:items-center sm:justify-between transition-all duration-200",
        className,
      )}
    >
      {/* Left / Top: rows per page + range readout */}
      <div className="flex items-center justify-between w-full sm:w-auto sm:justify-start gap-2.5 sm:gap-4">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-xs sm:text-sm font-normal text-muted-foreground whitespace-nowrap">
            Rows per page
          </span>
          <Select
            value={String(size)}
            onValueChange={(value) => {
              onSizeChange(Number(value));
              onPageChange(0);
            }}
            disabled={isLoading}
          >
            <SelectTrigger className="h-8 sm:h-9 w-auto min-w-[3.75rem] sm:min-w-[4.25rem] rounded-lg border border-border bg-background px-2 sm:px-3 text-xs sm:text-sm font-semibold text-foreground shadow-none hover:bg-muted/50 transition-colors cursor-pointer gap-1.5 sm:gap-2">
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

        <span className="hidden sm:block text-sm text-muted-foreground/50">|</span>

        <span className="text-xs sm:text-sm font-normal text-muted-foreground whitespace-nowrap">
          <span className="font-semibold text-foreground">
            {firstRow}
            {lastRow > firstRow ? `\u2013${lastRow}` : ""}
          </span>{" "}
          of <span className="font-semibold text-foreground">{totalElements}</span>{" "}
          {noun}
        </span>
      </div>

      {/* Right / Bottom: page navigation */}
      <div className="flex items-center justify-center w-full sm:w-auto gap-0.5 sm:gap-1 self-center sm:self-auto overflow-x-auto py-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={navButtonClass}
          aria-label="First page"
          disabled={!canGoBack}
          onClick={() => onPageChange(0)}
        >
          <ChevronsLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={navButtonClass}
          aria-label="Previous page"
          disabled={!canGoBack}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>

        <div className="flex items-center gap-0.5 sm:gap-1 px-0.5 sm:px-1">
          {pageItems.map((item, index) =>
            item === null ? (
              <span
                key={`ellipsis-${index}`}
                className="flex h-7 w-7 items-center justify-center text-xs text-muted-foreground select-none"
              >
                &#8230;
              </span>
            ) : (
              <button
                key={item}
                type="button"
                aria-label={`Page ${item + 1}`}
                aria-current={item === currentPage ? "page" : undefined}
                disabled={isLoading}
                onClick={() => onPageChange(item)}
                className={cn(
                  "flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer disabled:pointer-events-none disabled:opacity-50",
                  item === currentPage
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-foreground hover:bg-muted",
                )}
              >
                {item + 1}
              </button>
            ),
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={navButtonClass}
          aria-label="Next page"
          disabled={!canGoForward}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={navButtonClass}
          aria-label="Last page"
          disabled={!canGoForward}
          onClick={() => onPageChange(safeTotalPages - 1)}
        >
          <ChevronsRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  );
}

export default PaginationBar;
