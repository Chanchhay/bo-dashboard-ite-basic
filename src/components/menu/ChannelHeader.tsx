"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, QrCode, ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { InventoryPageHeader } from "@/components/inventory/InventoryUi";
import MenuQRModal from "@/components/menu/menu-qr-modal";
import { cn } from "@/lib/utils";

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
                            size="lg"
                            className="inline-flex items-center gap-2 border-primary/30 text-primary hover:bg-primary/5 shadow-2xs"
                        >
                            <QrCode className="w-4 h-4 text-primary" />
                            Menu QR Code
                        </Button>
                        <Link
                            href="/menu"
                            className={cn(
                                buttonVariants({ variant: "outline", size: "lg" }),
                                "inline-flex items-center gap-2 border-primary/30 text-primary hover:bg-primary/5 shadow-2xs"
                            )}
                        >
                            <ExternalLink className="w-4 h-4 text-primary" />
                            View Live Menu
                        </Link>
                        <Button
                            onClick={onOpenDialog}
                            disabled={disabled}
                            size="lg"
                            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white shadow-sm"
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
