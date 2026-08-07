"use client";

import { useState } from "react";
import { Plus, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InventoryPageHeader } from "@/components/inventory/InventoryUi";
import MenuQRModal from "@/components/menu/menu-qr-modal";

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
    const [isQRModalOpen, setIsQRModalOpen] = useState(false);

    return (
        <>
            <InventoryPageHeader
                title={title}
                description={description}
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsQRModalOpen(true)}
                            size="default"
                            className="inline-flex items-center gap-2 border-primary/30 text-primary bg-white dark:bg-card hover:bg-primary/10 dark:hover:bg-primary/15 dark:border-primary/40 shadow-xs font-bold transition-colors"
                        >
                            <QrCode className="w-4 h-4 text-primary" />
                            Menu QR Code
                        </Button>
                        <Button
                            onClick={onOpenDialog}
                            disabled={disabled}
                            size="default"
                            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white shadow-sm font-bold transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add item to {selectedChannelCode || activeChannelCode}
                        </Button>
                    </div>
                }
            />
            <MenuQRModal
                isOpen={isQRModalOpen}
                onClose={() => setIsQRModalOpen(false)}
            />
        </>
    );
}
