"use client";

import { useMoney } from "@/hooks/useMoney";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, LoaderCircle, ScanBarcode, X } from "lucide-react";

import { BarcodePreview } from "@/components/inventory/BarcodePreview";
import { getApiErrorMessage } from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useBarcodeKeyboard } from "@/hooks/useBarcodeKeyboard";
import { type InventoryItem } from "@/lib/api/inventory";
import { useLazyFindInventoryItemByBarcodeQuery } from "@/services/inventoryApi";


type BarcodeScannerOverlayProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onItemFound?: (item: InventoryItem) => void;
};

const BAR_WIDTHS = [3, 6, 2, 8, 3, 4, 9, 2, 5, 3, 7, 2, 4, 6, 3, 8, 2, 5];

function ScanAnimation() {
    return (
        <div className="relative w-full max-w-md overflow-hidden py-6">
            <div className="flex h-24 items-center justify-center gap-[3px]">
                {BAR_WIDTHS.map((width, index) => (
                    <span
                        key={index}
                        className="animate-scanner-bar h-full rounded-full bg-scanner-beam/70"
                        style={{
                            width: `${width}px`,
                            animationDelay: `${(index % 6) * 90}ms`,
                        }}
                    />
                ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex w-full items-center">
                <span className="animate-scanner-beam h-full w-1 rounded-full bg-scanner-beam shadow-[0_0_24px_6px_rgba(255,255,255,0.55)]" />
            </div>
        </div>
    );
}

export function BarcodeScannerOverlay({
    open,
    onOpenChange,
    onItemFound,
}: BarcodeScannerOverlayProps) {
    const { format: formatMoney } = useMoney();
    const [foundItem, setFoundItem] = useState<InventoryItem | null>(null);
    const [scannedCode, setScannedCode] = useState("");
    const [findItem, findState] = useLazyFindInventoryItemByBarcodeQuery();
    const { toast } = useToast();

    const close = useCallback(() => {
        setFoundItem(null);
        setScannedCode("");
        onOpenChange(false);
    }, [onOpenChange]);

    const handleScan = useCallback(
        async (value: string) => {
            setScannedCode(value);

            try {
                const item = await findItem(value, true).unwrap();

                if (onItemFound) {
                    onItemFound(item);
                    setFoundItem(null);
                    setScannedCode("");
                    onOpenChange(false);
                    return;
                }

                setFoundItem(item);
            } catch (error) {
                setFoundItem(null);
                setScannedCode("");
                toast({
                    tone: "error",
                    title: "Item not found",
                    description: getApiErrorMessage(
                        error,
                        `No item could be found for barcode ${value}.`,
                    ),
                });
            }
        },
        [findItem, onItemFound, onOpenChange, toast],
    );

    const listening = open && !foundItem && !findState.isFetching;
    const { buffer } = useBarcodeKeyboard({
        enabled: listening,
        onScan: handleScan,
        onCancel: close,
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previous;
        };
    }, [open]);

    useEffect(() => {
        if (!open || listening) {
            return;
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                close();
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, listening, close]);

    if (!open || typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Barcode scanner"
            className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-scanner-scrim px-6 backdrop-blur-[2px]"
        >
            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Close scanner"
                onClick={close}
                className="absolute top-6 right-6 text-scanner-ink hover:bg-scanner-ink/15 hover:text-scanner-ink"
            >
                <X />
            </Button>

            {foundItem ? (
                <section className="w-full max-w-md rounded-2xl bg-card p-6 text-card-foreground shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
                    <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <ScanBarcode className="size-6" />
                    </div>
                    <p className="text-lg font-semibold">
                        {foundItem.name || "Unnamed item"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {foundItem.sku || "No SKU"} ·{" "}
                        {formatMoney(foundItem.price, undefined, {
                            fallback: "Price not set",
                        })}
                    </p>
                    <BarcodePreview
                        value={foundItem.barcode || scannedCode}
                        className="mt-4"
                    />
                    <div className="mt-5 flex flex-wrap justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setFoundItem(null);
                                setScannedCode("");
                            }}
                        >
                            <ScanBarcode />
                            Scan another
                        </Button>
                        <Button
                            variant="outline"
                            render={
                                <a
                                    href={`/api/inventory/items/${encodeURIComponent(foundItem.id)}/barcode/image`}
                                    download
                                />
                            }
                            nativeButton={false}
                        >
                            <Download className="size-4 text-primary" />
                            Download PNG
                        </Button>
                        <Button
                            render={
                                <Link href={`/inventory/${foundItem.id}/edit`} />
                            }
                            nativeButton={false}
                        >
                            Edit item
                        </Button>
                    </div>
                </section>
            ) : (
                <div className="flex w-full flex-col items-center text-scanner-ink">
                    <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                        Barcode Scanner
                    </h2>

                    <ScanAnimation />

                    {findState.isFetching ? (
                        <p className="flex items-center gap-2 text-lg text-scanner-ink/85">
                            <LoaderCircle className="size-5 animate-spin" />
                            Looking up {scannedCode}…
                        </p>
                    ) : (
                        <p className="animate-scanner-pulse text-lg text-scanner-ink/85">
                            Scanning...
                        </p>
                    )}

                    <p className="mt-6 min-h-8 font-mono text-2xl tracking-[0.35em] text-scanner-ink">
                        {buffer}
                    </p>

                    <p className="mt-2 text-sm text-scanner-ink/60">
                        Point the scanner at a barcode, or type the code and
                        press Enter. Press Esc to cancel.
                    </p>
                </div>
            )}
        </div>,
        document.body,
    );
}
