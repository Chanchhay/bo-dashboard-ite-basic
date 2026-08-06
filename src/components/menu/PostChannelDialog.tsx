"use client";

import { useMoney } from "@/hooks/useMoney";
import { LoaderCircle, Plus } from "lucide-react";

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { InventoryItem } from "@/lib/api/inventory";

interface PostChannelDialogProps {
    open: boolean;
    title: string;
    selectedChannelName?: string;
    selectedItemId: string;
    inventoryItems: InventoryItem[];
    inventoryLoading: boolean;
    isPosting: boolean;
    onClose: () => void;
    onSelectItem: (value: string) => void;
    onSubmit: (event: React.FormEvent) => void;
}

/** What one item reads as, both in the list and in the closed trigger. */
function itemLabel(item: InventoryItem, format: (value: number) => string) {
    const code = item.code ? ` (${item.code})` : "";

    return `${item.name || "Unnamed item"}${code} — ${format(item.price ?? 0)}`;
}

export function PostChannelDialog({
    open,
    title,
    selectedChannelName,
    selectedItemId,
    inventoryItems,
    inventoryLoading,
    isPosting,
    onClose,
    onSelectItem,
    onSubmit,
}: PostChannelDialogProps) {
    const { format } = useMoney();

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader className="items-start gap-3 sm:flex-row sm:items-center">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                        <Plus className="size-5" aria-hidden="true" />
                    </span>
                    <div className="flex flex-col gap-1">
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>
                            The item becomes available to sell on this channel
                            straight away.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <form onSubmit={onSubmit} className="space-y-4 my-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Sales channel</label>
                        <Input
                            value={selectedChannelName || "Selected channel"}
                            disabled
                            className="bg-muted text-muted-foreground"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Item</label>
                        {/* Base UI shows the raw value in the trigger unless the
                            root is given a value -> label map. */}
                        <Select
                            value={selectedItemId}
                            onValueChange={(value) => onSelectItem(value || "")}
                            items={Object.fromEntries(
                                inventoryItems.map((inv) => [
                                    inv.id,
                                    itemLabel(inv, format),
                                ]),
                            )}
                        >
                            <SelectTrigger aria-label="Select item">
                                <SelectValue
                                    placeholder={inventoryLoading ? "Loading items…" : "Choose an item"}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {inventoryItems.map((inv) => (
                                    <SelectItem key={inv.id} value={inv.id}>
                                        {itemLabel(inv, format)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="pt-4 border-t border-border">
                        <Button variant="outline" type="button" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPosting || !selectedItemId}>
                            {isPosting && (
                                <LoaderCircle
                                    className="size-4 animate-spin"
                                    aria-hidden="true"
                                />
                            )}
                            {isPosting ? "Adding…" : "Add item"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
