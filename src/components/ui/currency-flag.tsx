"use client";

import { useState } from "react";
import { getCurrencyFlagUrl, getCurrencyNameAndCountry } from "@/lib/api/frankfurter";
import { cn } from "@/lib/utils";

interface CurrencyFlagProps {
    code: string;
    className?: string;
    size?: "xs" | "sm" | "md" | "lg";
}

const sizeClasses = {
    xs: "w-4 h-3 text-[9px]",
    sm: "w-5 h-3.5 text-[10px]",
    md: "w-6 h-4 text-xs",
    lg: "w-8 h-5.5 text-xs",
};

export function CurrencyFlag({ code, className, size = "md" }: CurrencyFlagProps) {
    const [hasError, setHasError] = useState(false);
    const flagUrl = getCurrencyFlagUrl(code);
    const { country, name } = getCurrencyNameAndCountry(code);
    const countryCode = code.slice(0, 2).toUpperCase();

    if (hasError) {
        return (
            <span
                className={cn(
                    "inline-flex items-center justify-center font-bold font-mono rounded bg-muted text-muted-foreground border border-border/60 shrink-0 select-none",
                    sizeClasses[size],
                    className
                )}
                title={country ? `${name} (${country})` : name}
            >
                {countryCode}
            </span>
        );
    }

    return (
        <img
            src={flagUrl}
            alt={`${code} flag`}
            title={country ? `${name} (${country})` : name}
            loading="lazy"
            onError={() => setHasError(true)}
            className={cn(
                "inline-block rounded-xs object-cover shadow-[0_1px_2px_rgba(0,0,0,0.15)] border border-black/10 dark:border-white/15 shrink-0 select-none",
                sizeClasses[size],
                className
            )}
        />
    );
}
