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
    selectedChannelId?: string;
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
    selectedChannelId,
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
                        Connect product ID and channel ID using backend endpoint{" "}
                        <strong className="font-mono text-emerald-700">POST /api/v1/item-channels</strong>.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={onSubmit} className="space-y-4 my-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#344038]">Target Sales Channel ID</label>
                        <Input
                            value={`${selectedChannelName || "Selected Channel"} (${selectedChannelId || "Selected Channel"})`}
                            disabled
                            className="bg-gray-100 font-mono text-xs"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#344038]">Select Product</label>
                        <Select value={selectedItemId} onValueChange={(value) => onSelectItem(value || "")}>
                            <SelectTrigger aria-label="Select product">
                                <SelectValue
                                    placeholder={inventoryLoading ? "Loading products..." : "Choose a product to link"}
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
                            {isPosting ? "Linking Product..." : "Post Item to Channel"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
