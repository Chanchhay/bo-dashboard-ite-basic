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
    known: boolean;
    open: boolean;
    channelName: string;
    todayHours?: string;
    summary?: string;
};

const UNKNOWN: PosChannelState = {
    known: false,
    open: true,
    channelName: "Point of Sale",
};

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
