"use client"

import { useState } from "react"
import { CalendarDays, Clock, X } from "lucide-react"

import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type DateValue = string

function toDateValue(date: Date): DateValue {
  return date.toLocaleDateString("en-CA")
}

function parseDateValue(value: DateValue | undefined): Date | undefined {
  if (!value) return undefined

  const parsed = new Date(`${value}T12:00:00`)

  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function DatePicker({
  id,
  value,
  onValueChange,
  min,
  max,
  disabled,
  placeholder = "Pick a date",
  className,
  "aria-invalid": ariaInvalid,
}: {
  id?: string
  value: DateValue
  onValueChange: (value: DateValue) => void
  min?: DateValue
  max?: DateValue
  disabled?: boolean
  placeholder?: string
  className?: string
  "aria-invalid"?: boolean
}) {
  const [open, setOpen] = useState(false)

  const selected = parseDateValue(value)
  const lower = parseDateValue(min)
  const upper = parseDateValue(max)

  const outOfRange = [
    ...(lower ? [{ before: lower }] : []),
    ...(upper ? [{ after: upper }] : []),
  ]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        type="button"
        disabled={disabled}
        aria-invalid={ariaInvalid}
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-background px-3.5 text-left text-sm transition-colors",
          "hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          "aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/20",
          "disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-50",
          className
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
        <span
          className={cn(
            "flex-1 truncate",
            selected ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {selected
            ? selected.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : placeholder}
        </span>

        {selected && !disabled ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear date"
            onClick={(event) => {
              event.stopPropagation()
              onValueChange("")
            }}
            className="grid size-5 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </span>
        ) : null}
      </PopoverTrigger>

      <PopoverContent className="w-auto">
        <Calendar
          mode="single"
          autoFocus
          selected={selected}
          defaultMonth={selected ?? lower ?? upper ?? new Date()}
          startMonth={lower}
          endMonth={upper}
          {...(outOfRange.length > 0 ? { disabled: outOfRange } : {})}
          onSelect={(date) => {
            onValueChange(date ? toDateValue(date) : "")
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export type DateTimeValue = string

function splitDateTime(value: DateTimeValue) {
  const [datePart = "", timePart = ""] = value ? value.split("T") : []

  return { datePart, timePart }
}

function DateTimePicker({
  id,
  value,
  onValueChange,
  min,
  max,
  disabled,
  placeholder = "Pick a date and time",
  className,
  "aria-invalid": ariaInvalid,
}: {
  id?: string
  value: DateTimeValue
  onValueChange: (value: DateTimeValue) => void
  min?: DateValue
  max?: DateValue
  disabled?: boolean
  placeholder?: string
  className?: string
  "aria-invalid"?: boolean
}) {
  const [open, setOpen] = useState(false)

  const { datePart, timePart } = splitDateTime(value)
  const selected = parseDateValue(datePart)
  const lower = parseDateValue(min)
  const upper = parseDateValue(max)

  const outOfRange = [
    ...(lower ? [{ before: lower }] : []),
    ...(upper ? [{ after: upper }] : []),
  ]

  function commit(nextDate: DateValue, nextTime: string) {
    if (!nextDate && !nextTime) {
      onValueChange("")
      return
    }

    const day = nextDate || toDateValue(new Date())

    onValueChange(`${day}T${nextTime || "00:00"}`)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        type="button"
        disabled={disabled}
        aria-invalid={ariaInvalid}
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-background px-3.5 text-left text-sm transition-colors",
          "hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          "aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/20",
          "disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-50",
          className
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
        <span
          className={cn(
            "flex-1 truncate",
            selected ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {selected
            ? `${selected.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}, ${timePart || "00:00"}`
            : placeholder}
        </span>

        {selected && !disabled ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear date and time"
            onClick={(event) => {
              event.stopPropagation()
              onValueChange("")
            }}
            className="grid size-5 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </span>
        ) : null}
      </PopoverTrigger>

      <PopoverContent className="w-auto">
        <Calendar
          mode="single"
          autoFocus
          selected={selected}
          defaultMonth={selected ?? lower ?? upper ?? new Date()}
          startMonth={lower}
          endMonth={upper}
          {...(outOfRange.length > 0 ? { disabled: outOfRange } : {})}
          onSelect={(date) => commit(date ? toDateValue(date) : "", timePart)}
        />

        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <Clock className="size-4 shrink-0 text-muted-foreground" />
          <Input
            type="time"
            aria-label="Time"
            value={timePart}
            onChange={(event) => commit(datePart, event.target.value)}
            className="h-9 flex-1"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker, DateTimePicker, toDateValue }
