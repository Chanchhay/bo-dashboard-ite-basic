"use client";

import { useEffect } from "react";

import { useGetChannelItemsQuery } from "@/services/salesChannelApi";

/** Item id -> the id of the link that put it on a channel. */
export type ChannelMembership = Record<string, string>;

/**
 * What one channel already sells, reported up.
 *
 * An item and a channel can only be linked once — the backend has a unique
 * constraint on the pair — so publishing a batch that includes anything already
 * published would fail the whole batch. Reading each channel's items first is
 * what lets the batch skip those pairs instead of choking on them.
 *
 * The link's own id is kept alongside the item's, because taking an item back
 * off a channel deletes the link and there is no endpoint that finds one from
 * the pair — without it, unpublishing would need a second read per item.
 *
 * One component per channel because a hook cannot be called in a loop, and the
 * reads are cached, so this costs one request per channel while the form is open.
 */
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

/**
 * Folds one channel's answer in, without re-rendering on an unchanged one.
 *
 * Cached reads re-report the same ids on every render pass, and a fresh object
 * each time would never settle.
 */
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
