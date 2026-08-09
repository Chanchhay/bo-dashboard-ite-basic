"use client";

import { InventoryPageHeader } from "@/components/inventory/InventoryUi";

interface ChannelHeaderProps {
    title: string;
    description: string;
}

export function ChannelHeader({
    title,
    description,
}: ChannelHeaderProps) {
    return (
        <InventoryPageHeader
            title={title}
            description={description}
        />
    );
}
