import type { DraftOverride } from "@/components/sales/pricing/channel-lines";
import type { ChannelListing } from "@/lib/api/channel-pricing";
import { channelLineKey, type OverrideKind } from "@/lib/sale-pricing/pricing";
import { emptySchedule, type ChannelSchedule } from "@/lib/sale-pricing/schedule";

export type ChannelDraft = {
    enabled: Set<string>;
    globalKind: OverrideKind;
    globalValue: string;
    overrides: Record<string, DraftOverride>;
    schedule: ChannelSchedule;
};

export function toChannelDraft(
    listing: ChannelListing | undefined,
): ChannelDraft {
    const overrides: Record<string, DraftOverride> = {};

    for (const line of listing?.overrides || []) {
        const key = channelLineKey(
            line.itemId,
            line.variantId || undefined,
            line.unitId || undefined,
        );

        overrides[key] = {
            itemId: line.itemId,
            ...(line.variantId ? { variantId: line.variantId } : {}),
            ...(line.unitId ? { unitId: line.unitId } : {}),
            kind: (line.kind || "INHERIT") as OverrideKind,
            value: line.value == null ? "" : String(line.value),
        };
    }

    return {
        enabled: new Set(listing?.enabledItemIds || []),
        globalKind: (listing?.globalRule?.kind || "INHERIT") as OverrideKind,
        globalValue:
            listing?.globalRule?.value == null
                ? ""
                : String(listing.globalRule.value),
        overrides,
        schedule: listing?.schedule
            ? (listing.schedule as ChannelSchedule)
            : { ...emptySchedule(), alwaysOpen: true },
    };
}
