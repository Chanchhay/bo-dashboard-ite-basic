"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"

/*
 * The shadcn calendar, dressed in this app's palette.
 *
 * `globals.css` defines its own token set, so the stock classes (`bg-accent`,
 * `text-primary-foreground`, `ring-ring`) would emit nothing here — the styles
 * below use the tokens the rest of the app is built from, the same way
 * `button.tsx` does.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("w-fit", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "flex flex-col gap-4",
        month_caption: "flex h-9 items-center justify-center px-9",
        caption_label: "text-sm font-semibold text-foreground",
        nav: "flex items-center justify-between absolute inset-x-0 top-0 h-9 px-0",
        button_previous:
          "inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        button_next:
          "inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
        week: "flex w-full mt-1",
        day: "size-9 p-0 text-center",
        day_button: cn(
          "size-9 rounded-lg text-sm font-medium text-foreground transition-colors",
          "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          "disabled:pointer-events-none disabled:opacity-30"
        ),
        // The chosen day carries the fill; today carries only a ring, so the
        // two are still distinguishable when they are the same day.
        selected:
          "[&>button]:bg-primary [&>button]:text-white [&>button]:hover:bg-primary/90",
        today: "[&>button]:ring-1 [&>button]:ring-primary/40",
        outside: "[&>button]:text-muted-foreground/40",
        disabled: "[&>button]:opacity-30",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" {...chevronProps} />
          ) : (
            <ChevronRight className="size-4" {...chevronProps} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
