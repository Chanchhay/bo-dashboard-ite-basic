"use client";

import Barcode from "react-barcode";

import { cn } from "@/lib/utils";

type BarcodePreviewProps = {
    value: string;
    className?: string;
    compact?: boolean;
};

export function BarcodePreview({
    value,
    className,
    compact = false,
}: BarcodePreviewProps) {
    const barcode = value.trim();

    if (!barcode) {
        return null;
    }

    return (
        <div
            className={cn(
                "overflow-x-auto rounded-xl border border-[#e4eae2] bg-white p-3",
                className,
            )}
        >
            <Barcode
                value={barcode}
                format="CODE128"
                renderer="svg"
                width={compact ? 1.25 : 1.6}
                height={compact ? 34 : 52}
                margin={0}
                fontSize={compact ? 11 : 14}
                background="#ffffff"
                lineColor="#161d16"
                className="mx-auto max-w-full"
            />
        </div>
    );
}
