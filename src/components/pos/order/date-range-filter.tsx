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
      <DropdownMenuTrigger className="flex h-[50px] w-full shrink-0 items-center gap-3 rounded-xl border border-[#c6c6cd] bg-white/90 px-4 text-sm text-[#45464d] outline-none hover:bg-[#fbfcfa] focus-visible:ring-2 focus-visible:ring-primary/25 sm:w-auto sm:min-w-[308px] sm:px-6 sm:text-base">
        <Calendar className="size-4 text-primary sm:size-5" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate whitespace-nowrap">{from} - {to}</span>
        <ChevronDown className="size-4 shrink-0 text-[#45464d]" aria-hidden="true" />
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
