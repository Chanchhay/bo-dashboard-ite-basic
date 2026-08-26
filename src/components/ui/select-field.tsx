"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SelectOption = {
    value: string;
    label: React.ReactNode;
};

export function SelectField({
    id,
    name,
    options,
    value,
    defaultValue,
    onValueChange,
    placeholder,
    invalid,
    disabled,
    className,
    contentClassName,
    size = "default",
}: {
    id?: string;
    name?: string;
    options: SelectOption[];
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    invalid?: boolean;
    disabled?: boolean;
    className?: string;
    contentClassName?: string;
    size?: "sm" | "default";
}) {
    const items = Object.fromEntries(
        options.map((option) => [option.value, option.label]),
    );

    return (
        <Select
            name={name}
            items={items}
            disabled={disabled}
            {...(value !== undefined
                ? { value }
                : { defaultValue: defaultValue ?? null })}
            onValueChange={
                onValueChange
                    ? (next: unknown) => onValueChange(String(next ?? ""))
                    : undefined
            }
        >
            <SelectTrigger
                id={id}
                size={size}
                aria-invalid={invalid}
                className={cn("w-full", className)}
            >
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent align="start" className={contentClassName}>
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
