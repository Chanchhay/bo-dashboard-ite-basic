"use client";

import { useEffect } from "react";

import { useGetChannelItemsQuery } from "@/services/salesChannelApi";

export type ChannelMembership = Record<string, string>;

export function ChannelMembershipProbe({
    channelId,
    channelCode,
    skip,
    onLoaded,
}: {
    channelId: string;
    channelCode: string;
    skip: boolean;
    onLoaded: (channelId: string, membership: ChannelMembership) => void;
}) {
    const { data } = useGetChannelItemsQuery(channelCode, { skip });

    useEffect(() => {
        if (!data) return;

        const membership: ChannelMembership = {};

        data.forEach((entry) => {
            if (entry.item?.id && entry.itemChannelId) {
                membership[entry.item.id] = entry.itemChannelId;
            }
        });

        onLoaded(channelId, membership);
    }, [channelId, data, onLoaded]);

    return null;
}

export function mergeMembership(
    previous: Record<string, ChannelMembership>,
    channelId: string,
    membership: ChannelMembership,
) {
    const existing = previous[channelId];

    if (existing) {
        const existingIds = Object.keys(existing);
        const nextIds = Object.keys(membership);

        if (
            existingIds.length === nextIds.length &&
            nextIds.every((id) => existing[id] === membership[id])
        ) {
            return previous;
        }
    }

    return { ...previous, [channelId]: membership };
}
