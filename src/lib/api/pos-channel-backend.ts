import { backendRequest } from "@/lib/api/backend";
import { getInventoryBusinessId } from "@/lib/api/inventory-backend";
import {
    channelListingPath,
    type ChannelListing,
} from "@/lib/api/channel-pricing";
import type { SalesChannel } from "@/lib/api/sales-channels";
import {
    dayIndex,
    dayKeys,
    describeDay,
    describeSchedule,
    isOpenAt,
    type ChannelSchedule,
} from "@/lib/sale-pricing/schedule";

export type PosChannelState = {
    /**
     * False when the answer could not be established. Callers must not treat
     * that as closed — a backend blip is not the shop being shut, and failing
     * closed would stop trading over a network hiccup.
     */
    known: boolean;
    open: boolean;
    channelName: string;
    /** Today's hours, for telling a cashier when they can open. */
    todayHours?: string;
    /** The week at a glance, when today alone does not explain it. */
    summary?: string;
};

const UNKNOWN: PosChannelState = {
    known: false,
    open: true,
    channelName: "Point of Sale",
};

/**
 * Whether the POS channel is taking orders right now.
 *
 * The listing is addressed by channel id, so the channel is resolved by code
 * first. A channel with no schedule counts as open: that is what an unset
 * schedule means everywhere else, and it keeps a shop that never configured
 * hours trading normally.
 */
export async function getPosChannelState(): Promise<PosChannelState> {
    try {
        const channels =
            await backendRequest<SalesChannel[]>("/api/v1/sales-channels");

        const pos = (channels ?? []).find(
            (channel) => channel.code?.toUpperCase() === "POS",
        );

        if (!pos) return UNKNOWN;

        const businessId = await getInventoryBusinessId();
        const listing = await backendRequest<ChannelListing>(
            channelListingPath(businessId, pos.id),
        );

        const name = listing?.name || pos.name || "Point of Sale";
        const schedule = listing?.schedule as ChannelSchedule | null | undefined;

        if (!schedule) {
            return { known: true, open: true, channelName: name };
        }

        const now = new Date();
        // The backend's own verdict wins when it offers one: the shop's clock
        // is authoritative, not whatever the till's device thinks the time is.
        const open =
            typeof listing?.openNow === "boolean"
                ? listing.openNow
                : isOpenAt(schedule, now);

        return {
            known: true,
            open,
            channelName: name,
            todayHours: describeDay(schedule.days[dayKeys[dayIndex(now)]]),
            summary: describeSchedule(schedule),
        };
    } catch {
        return UNKNOWN;
    }
}
