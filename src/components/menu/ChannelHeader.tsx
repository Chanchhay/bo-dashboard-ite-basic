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
                            className="inline-flex items-center gap-2 border-[#00932a]/60 dark:border-[#00932a]/70 text-[#00932a] dark:text-[#00932a] hover:bg-[#00932a]/10 dark:hover:bg-[#00932a]/20 dark:bg-[#1a1e29] shadow-2xs font-bold"
                        >
                            <QrCode className="w-4 h-4 text-[#00932a] dark:text-[#00932a]" />
                            Menu QR Code
                        </Button>
                        <Link
                            href="/menu"
                            className={cn(
                                buttonVariants({ variant: "outline", size: "lg" }),
                                "inline-flex items-center gap-2 border-[#00932a]/60 dark:border-[#00932a]/70 text-[#00932a] dark:text-[#00932a] hover:bg-[#00932a]/10 dark:hover:bg-[#00932a]/20 dark:bg-[#1a1e29] shadow-2xs font-bold"
                            )}
                        >
                            <ExternalLink className="w-4 h-4 text-[#00932a] dark:text-[#00932a]" />
                            View Live Menu
                        </Link>
                        <Button
                            onClick={onOpenDialog}
                            disabled={disabled}
                            size="lg"
                            className="inline-flex items-center gap-2 bg-[#00932a] hover:bg-[#00932a]/90 text-white shadow-sm font-bold"
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
