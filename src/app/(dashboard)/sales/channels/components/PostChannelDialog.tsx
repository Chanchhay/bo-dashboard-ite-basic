import { Plus } from "lucide-react";

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
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="w-5 h-5 text-emerald-600" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>
                        The item becomes available to sell on this channel
                        straight away.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit} className="space-y-4 my-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#344038]">Sales channel</label>
                        <Input
                            value={selectedChannelName || "Selected channel"}
                            disabled
                            className="bg-gray-100"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#344038]">Item</label>
                        <Select value={selectedItemId} onValueChange={(value) => onSelectItem(value || "")}>
                            <SelectTrigger aria-label="Select item">
                                <SelectValue
                                    placeholder={inventoryLoading ? "Loading items…" : "Choose an item"}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {inventoryItems.map((inv) => (
                                    <SelectItem key={inv.id} value={inv.id}>
                                        {inv.name} {inv.code ? `(${inv.code})` : ""} - ${inv.price ?? 0}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="pt-4 border-t border-[#e4eae2]">
                        <Button variant="outline" type="button" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPosting || !selectedItemId}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {isPosting ? "Adding…" : "Add item"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
