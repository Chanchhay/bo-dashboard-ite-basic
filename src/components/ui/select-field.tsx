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
    label: string;
};

/**
 * The app's one select control. Use this rather than assembling
 * `Select`/`SelectTrigger`/`SelectItem` by hand, or a native `<select>` — it
 * keeps every dropdown the same widget, and it derives the `items` map from
 * `options` so the trigger always shows the label. Building the parts by hand
 * is what let ids leak into the trigger, because Base UI renders the raw value
 * unless `items` is supplied.
 *
 * Uncontrolled inside a form: pass `name` (+ optional `defaultValue`) and read
 * it back with `FormData`. Controlled: pass `value` and `onValueChange`.
 */
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
