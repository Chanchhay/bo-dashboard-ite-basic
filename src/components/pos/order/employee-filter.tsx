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
      <DropdownMenuTrigger className="flex h-[50px] w-full shrink-0 items-center gap-3 rounded-xl border border-[#c6c6cd] bg-white/90 px-4 text-sm text-[#45464d] outline-none hover:bg-[#fbfcfa] focus-visible:ring-2 focus-visible:ring-primary/25 sm:w-auto sm:min-w-[213px] sm:px-6 sm:text-base">
        <User className="size-4 text-primary sm:size-5" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate whitespace-nowrap">{selected ? selected.name : emptyLabel}</span>
        <ChevronDown className="size-4 shrink-0 text-[#45464d]" aria-hidden="true" />
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
