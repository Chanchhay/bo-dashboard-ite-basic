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
  | "this_month"
  | "custom";
const PRESET_LABELS: Record<DateRangePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This week",
  this_month: "This month",
  custom: "Custom range",
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
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
        <Calendar className="h-4 w-4 text-green-600" />
        {from} - {to}
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {(Object.keys(PRESET_LABELS) as DateRangePreset[]).map((key) => (
          <DropdownMenuItem key={key} onClick={() => onChange(key)}>
            <span className="flex-1">{PRESET_LABELS[key]}</span>
            {preset === key && <Check className="h-4 w-4 text-green-600" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}