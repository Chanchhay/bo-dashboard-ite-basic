"use client";

import Link from "next/link";
import { useState, type SubmitEvent } from "react";
import { Download, LoaderCircle, ScanBarcode } from "lucide-react";

import { BarcodePreview } from "@/components/inventory/BarcodePreview";
import {
    formatMoney,
    getApiErrorMessage,
    inventoryControlClassName,
} from "@/components/inventory/InventoryUi";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { type InventoryItem } from "@/lib/api/inventory";
import { useLazyFindInventoryItemByBarcodeQuery } from "@/services/inventoryApi";

type BarcodeScannerDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onItemFound?: (item: InventoryItem) => void;
};

export function BarcodeScannerDialog({
    open,
    onOpenChange,
    onItemFound,
}: BarcodeScannerDialogProps) {
    const [barcode, setBarcode] = useState("");
    const [foundItem, setFoundItem] = useState<InventoryItem | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [findItem, findState] = useLazyFindInventoryItemByBarcodeQuery();

    function reset() {
        setBarcode("");
        setFoundItem(null);
        setMessage(null);
    }

    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) {
            reset();
        }

        onOpenChange(nextOpen);
    }

    async function handleLookup(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        event.stopPropagation();
        const value = barcode.trim();

        if (!value) {
            setFoundItem(null);
            setMessage("Scan or enter a barcode first.");
            return;
        }

        setMessage(null);

        try {
            const item = await findItem(value, true).unwrap();

            if (onItemFound) {
                onItemFound(item);
                handleOpenChange(false);
                return;
            }

            setFoundItem(item);
        } catch (error) {
            setFoundItem(null);
            setMessage(
                getApiErrorMessage(
                    error,
                    "No item could be found for that barcode.",
                ),
            );
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <ScanBarcode className="size-6" />
                    </div>
                    <DialogTitle>Scan a barcode</DialogTitle>
                    <DialogDescription>
                        Keep this field focused and scan with a USB or Bluetooth
                        scanner. You can also enter the code manually.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={handleLookup}
                    className="mt-5 flex flex-col gap-4"
                >
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                            autoFocus
                            value={barcode}
                            onChange={(event) => {
                                setBarcode(event.target.value);
                                setMessage(null);
                                setFoundItem(null);
                            }}
                            placeholder="Scan or enter barcode"
                            aria-label="Barcode"
                            className={`${inventoryControlClassName} flex-1 font-mono`}
                        />
                        <Button
                            type="submit"
                            disabled={findState.isFetching}
                            className="h-12.5"
                        >
                            {findState.isFetching ? (
                                <LoaderCircle className="animate-spin" />
                            ) : (
                                <ScanBarcode />
                            )}
                            Find item
                        </Button>
                    </div>

                    {message ? (
                        <p
                            className="rounded-xl border border-brand-red/20 bg-brand-red/5 px-4 py-3 text-sm text-brand-red"
                            role="alert"
                        >
                            {message}
                        </p>
                    ) : null}

                    {foundItem ? (
                        <section className="rounded-2xl border border-[#e4eae2] bg-[#f8faf7] p-4">
                            <div className="flex flex-col gap-1">
                                <p className="text-lg font-semibold text-[#161d16]">
                                    {foundItem.name || "Unnamed item"}
                                </p>
                                <p className="text-sm text-[#657064]">
                                    {foundItem.sku || "No SKU"} · {formatMoney(foundItem.price)}
                                </p>
                            </div>
                            <BarcodePreview
                                value={foundItem.barcode || barcode}
                                className="mt-4"
                            />
                            <div className="mt-4 flex flex-wrap justify-end gap-2">
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
                                    <Download />
                                    Download PNG
                                </Button>
                                <Button
                                    render={
                                        <Link
                                            href={`/inventory/${foundItem.id}/edit`}
                                        />
                                    }
                                    nativeButton={false}
                                >
                                    Edit item
                                </Button>
                            </div>
                        </section>
                    ) : null}
                </form>

                <DialogFooter className="mt-5">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                    >
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
