"use client";

import { useState, useRef, useEffect } from "react";
import { SlidersHorizontal, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ColumnConfig = {
    id: string;
    label: string;
    visible: boolean;
};

interface ColumnSelectDropdownProps {
    columns: ColumnConfig[];
    onToggleColumn: (id: string) => void;
    onResetDefaults?: () => void;
}

export function ColumnSelectDropdown({
    columns,
    onToggleColumn,
    onResetDefaults,
}: ColumnSelectDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const visibleCount = columns.filter((c) => c.visible).length;

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative inline-block text-left shrink-0" ref={dropdownRef}>
            <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(!isOpen)}
                className="h-10 gap-2 rounded-xl border border-border bg-card px-3.5 text-sm font-medium text-foreground hover:bg-muted/80 shadow-xs transition-colors"
            >
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <span>Columns</span>
            </Button>

            {isOpen && (
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-lg ring-1 ring-foreground/5 animate-in fade-in-0 zoom-in-95">
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-border mb-1">
                        <span className="text-xs font-semibold text-foreground">
                            Display Columns
                        </span>
                        {onResetDefaults && (
                            <button
                                type="button"
                                onClick={onResetDefaults}
                                className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                            >
                                <RotateCcw className="h-3 w-3" />
                                Reset
                            </button>
                        )}
                    </div>

                    <div className="space-y-0.5 max-h-64 overflow-y-auto py-1">
                        {columns.map((col) => (
                            <button
                                key={col.id}
                                type="button"
                                onClick={() => onToggleColumn(col.id)}
                                className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-lg hover:bg-muted/80 transition-colors text-left text-foreground"
                            >
                                <span className="truncate">{col.label}</span>
                                <div
                                    className={`h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                                        col.visible
                                            ? "bg-primary border-primary text-white"
                                            : "border-input bg-background"
                                    }`}
                                >
                                    {col.visible && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
