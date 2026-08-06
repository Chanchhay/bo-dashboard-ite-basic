"use client";

import { User, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface EmployeeOption {
  id: string;
  name: string;
}

export interface EmployeeFilterProps {
  employees: EmployeeOption[];
  value: string | null; // null = "All employees"
  onChange: (employeeId: string | null) => void;
  allowAll?: boolean;
  emptyLabel?: string;
}

export function EmployeeFilter({
  employees,
  value,
  onChange,
  allowAll = true,
  emptyLabel = "All employees",
}: EmployeeFilterProps) {
  const selected = employees.find((e) => e.id === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-11 sm:h-[50px] flex-1 min-w-0 sm:flex-none shrink-0 items-center gap-2 sm:gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1e29] px-3 sm:px-5 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 outline-none transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-primary/25 sm:min-w-[180px]">
        <User className="size-4 shrink-0 text-primary sm:size-5" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate whitespace-nowrap">{selected ? selected.name : emptyLabel}</span>
        <ChevronDown className="size-4 shrink-0 text-gray-400 dark:text-gray-500" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {allowAll && (
          <DropdownMenuItem onClick={() => onChange(null)}>
            <span className="flex-1">All employees</span>
            {value === null && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        )}
        {employees.map((emp) => (
          <DropdownMenuItem key={emp.id} onClick={() => onChange(emp.id)}>
            <span className="flex-1">{emp.name}</span>
            {value === emp.id && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
