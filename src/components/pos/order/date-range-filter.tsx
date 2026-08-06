"use client";

import { Calendar, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month";
const PRESET_LABELS: Record<DateRangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This week",
  this_month: "This month",
};

export interface DateRangeFilterProps {
  from: string; 
  to: string;
  preset: DateRangePreset;
  onChange: (preset: DateRangePreset) => void;
}

export function DateRangeFilter({ from, to, preset, onChange }: DateRangeFilterProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-11 sm:h-[50px] flex-1 min-w-0 sm:flex-none shrink-0 items-center gap-2 sm:gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1e29] px-3 sm:px-5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 outline-none transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-primary/25 sm:min-w-[260px]">
        <Calendar className="size-4 shrink-0 text-primary sm:size-5" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate whitespace-nowrap">{from} - {to}</span>
        <ChevronDown className="size-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {(Object.keys(PRESET_LABELS) as DateRangePreset[]).map((key) => (
          <DropdownMenuItem key={key} onClick={() => onChange(key)}>
            <span className="flex-1">{PRESET_LABELS[key]}</span>
            {preset === key && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
