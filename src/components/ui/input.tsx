"use client";

import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";
import { controlClassName } from "@/components/ui/form-controls";

function Input({
  className,
  type = "text",
  onKeyDown,
  onInput,
  onChange,
  onWheel,
  ...props
}: React.ComponentProps<"input">) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (type !== "password" && type !== "file") {
      if (e.key === " ") {
        const input = e.currentTarget;
        const start = input.selectionStart ?? 0;
        const val = input.value;

        // Prevent leading space or consecutive multiple spaces
        if (start === 0 || val.slice(start - 1, start) === " ") {
          e.preventDefault();
          onKeyDown?.(e);
          return;
        }
      }
    }
    onKeyDown?.(e);
  };

  const handleInput = (e: React.InputEvent<HTMLInputElement>) => {
    if (type !== "password" && type !== "file") {
      const input = e.currentTarget;
      const val = input.value;
      const cleaned = val.replace(/^\s+/, "").replace(/\s+/g, " ");

      if (cleaned !== val) {
        input.value = cleaned;
      }
    }
    onInput?.(e);
  };

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    if (type === "number") {
      e.currentTarget.blur();
    }
    onWheel?.(e);
  };

  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        controlClassName,
        "min-w-0 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground disabled:pointer-events-none",
        className
      )}
      onKeyDown={handleKeyDown}
      onInput={handleInput}
      onChange={onChange}
      onWheel={handleWheel}
      {...props}
    />
  );
}

export { Input };
