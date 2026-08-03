import { Plus, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InventoryPageHeader } from "@/components/inventory/InventoryUi";

interface ChannelHeaderProps {
    title: string;
    description: string;
    selectedChannelCode?: string;
    activeChannelCode: string;
    onOpenDialog: () => void;
    disabled?: boolean;
}

export function ChannelHeader({
    title,
    description,
    selectedChannelCode,
    activeChannelCode,
    onOpenDialog,
    disabled,
}: ChannelHeaderProps) {
    return (
        <InventoryPageHeader
            title={title}
            description={description}
            action={
                <Button
                    onClick={onOpenDialog}
                    disabled={disabled}
                    size="lg"
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add item to {selectedChannelCode || activeChannelCode}
                </Button>
            }
        />
    );
}
