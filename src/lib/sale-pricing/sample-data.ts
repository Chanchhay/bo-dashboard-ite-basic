/**
 * Sample catalogue for the static Sale Management pricing screens.
 *
 * Built around the beer case so packages are visible: one item, four sellable
 * units, one stock balance behind them. Delete once the API exists.
 */

import type {
    ChannelListing,
    PricedItem,
    PricingGroup,
    SellingChannel,
} from "@/lib/sale-pricing/pricing";
import type { ChannelSchedule, DayKey, DaySchedule } from "@/lib/sale-pricing/schedule";
import { dayKeys } from "@/lib/sale-pricing/schedule";

export const sampleGroups: PricingGroup[] = [
    { id: "g-drinks", name: "Drinks" },
    { id: "g-beer", name: "Beer & cider" },
    { id: "g-food", name: "Food" },
];

export const sampleChannels: SellingChannel[] = [
    {
        id: "ch-pos",
        code: "POS",
        name: "Point of Sale",
        description: "The in-store till.",
    },
    {
        id: "ch-web",
        code: "WEB",
        name: "Online store",
        description: "Your storefront.",
    },
    {
        id: "ch-telegram",
        code: "TELEGRAM",
        name: "Telegram",
        description: "Bot and channel orders.",
    },
];

export const samplePricedItems: PricedItem[] = [
    {
        id: "i-beer",
        name: "Angkor Lager",
        sku: "BEER-ANG",
        groupId: "g-beer",
        available: true,
        baseUnitLabel: "Can",
        units: [
            { id: "u-can", label: "Can", factor: 1 },
            { id: "u-sixpack", label: "Six-pack", factor: 6 },
            { id: "u-halfcase", label: "Half case", factor: 12 },
            { id: "u-case", label: "Case", factor: 24 },
        ],
        basePrices: {
            "u-can": 1.5,
            "u-sixpack": 8,
            "u-halfcase": 15,
            "u-case": 28,
        },
    },
    {
        id: "i-cider",
        name: "Apple Cider",
        sku: "BEER-CID",
        groupId: "g-beer",
        available: false,
        baseUnitLabel: "Bottle",
        units: [
            { id: "u-bottle", label: "Bottle", factor: 1 },
            { id: "u-crate", label: "Crate", factor: 12 },
        ],
        basePrices: { "u-bottle": 2.25, "u-crate": 24 },
    },
    {
        id: "i-latte",
        name: "Ice Latte",
        sku: "DRK-LAT",
        groupId: "g-drinks",
        available: true,
        baseUnitLabel: "Cup",
        units: [{ id: "u-cup", label: "Cup", factor: 1 }],
        basePrices: { "u-cup": 3.5 },
    },
    {
        id: "i-coffee",
        name: "House Coffee beans",
        sku: "DRK-BEAN",
        groupId: "g-drinks",
        available: true,
        baseUnitLabel: "Gram",
        units: [
            { id: "u-g", label: "Gram", factor: 1 },
            { id: "u-250", label: "250 g bag", factor: 250 },
            { id: "u-1kg", label: "1 kg bag", factor: 1000 },
        ],
        // The loose gram is deliberately unpriced: you stock in grams but only
        // ever sell bags. An unpriced unit is simply not sellable.
        basePrices: { "u-250": 6.5, "u-1kg": 22 },
    },
    {
        id: "i-croissant",
        name: "Butter Croissant",
        sku: "FD-CRS",
        groupId: "g-food",
        available: true,
        baseUnitLabel: "Piece",
        units: [
            { id: "u-pc", label: "Piece", factor: 1 },
            { id: "u-box6", label: "Box of 6", factor: 6 },
        ],
        basePrices: { "u-pc": 2.75, "u-box6": 15 },
    },
];

export const sampleListings: ChannelListing[] = [
    {
        channelId: "ch-pos",
        itemIds: ["i-beer", "i-latte", "i-coffee", "i-croissant"],
        overrides: {},
    },
    {
        channelId: "ch-web",
        itemIds: ["i-beer", "i-coffee", "i-croissant"],
        overrides: {
            // Delivery packaging and handling, expressed as a rule so it holds
            // when the base moves.
            "i-beer:u-case": { kind: "MARKUP_PERCENT", percent: 8 },
            "i-coffee:u-1kg": { kind: "MARKUP_AMOUNT", amount: 1.5 },
            // A round number the storefront advertises, negotiated rather than
            // derived — so it is absolute on purpose.
            "i-croissant:u-box6": { kind: "ABSOLUTE", amount: 17.5 },
        },
    },
    {
        channelId: "ch-telegram",
        itemIds: ["i-latte", "i-croissant"],
        overrides: {
            "i-latte:u-cup": { kind: "MARKUP_PERCENT", percent: 10 },
        },
    },
];

/** Builds a week where every day shares the same hours. */
function everyDay(open: string, close: string): ChannelSchedule {
    return {
        alwaysOpen: false,
        days: Object.fromEntries(
            dayKeys.map((key) => [
                key,
                { closed: false, windows: [{ open, close }] },
            ]),
        ) as Record<DayKey, DaySchedule>,
    };
}

export const sampleSchedules: Record<string, ChannelSchedule> = {
    // The till: open late on Friday and Saturday, closed Sunday.
    "ch-pos": (() => {
        const schedule = everyDay("07:00", "20:00");
        schedule.days.FRI.windows = [{ open: "07:00", close: "23:00" }];
        // Runs past midnight — the window belongs to the day it starts on.
        schedule.days.SAT.windows = [{ open: "08:00", close: "01:00" }];
        schedule.days.SUN.closed = true;
        return schedule;
    })(),

    // The storefront never sleeps; orders queue until someone picks them up.
    "ch-web": { alwaysOpen: true, days: everyDay("00:00", "23:59").days },

    // Staffed by hand, so it takes orders over lunch and again in the evening.
    "ch-telegram": (() => {
        const schedule = everyDay("11:00", "14:00");
        for (const key of dayKeys) {
            schedule.days[key].windows = [
                { open: "11:00", close: "14:00" },
                { open: "17:00", close: "21:00" },
            ];
        }
        schedule.days.SUN.closed = true;
        return schedule;
    })(),
};
