"use client";

import { useState } from "react";
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
}

export function EmployeeFilter({ employees, value, onChange }: EmployeeFilterProps) {
  const selected = employees.find((e) => e.id === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
        <User className="h-4 w-4 text-gray-400" />
        {selected ? selected.name : "All employees"}
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onClick={() => onChange(null)}>
          <span className="flex-1">All employees</span>
          {value === null && <Check className="h-4 w-4 text-primary" />}
        </DropdownMenuItem>
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