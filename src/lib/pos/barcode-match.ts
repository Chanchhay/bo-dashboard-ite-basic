import type { ChannelItem } from "@/lib/api/sales-channels";

export type ScanMatch = {
    entry: ChannelItem;
    variantId?: string;
    matchedOn: "barcode" | "sku" | "code";
};

export type ScanIndex = Map<string, ScanMatch>;

function normalize(value: string | null | undefined) {
    return value?.trim().toLocaleLowerCase() ?? "";
}

export function buildScanIndex(channelItems: ChannelItem[]): ScanIndex {
    const index: ScanIndex = new Map();

    function claim(code: string | null | undefined, match: ScanMatch) {
        const key = normalize(code);

        if (key && !index.has(key)) {
            index.set(key, match);
        }
    }

    for (const entry of channelItems) {
        for (const variant of entry.item.variants ?? []) {
            if (variant.id) {
                claim(variant.barcode, {
                    entry,
                    variantId: variant.id,
                    matchedOn: "barcode",
                });
            }
        }

        claim(entry.item.barcode, { entry, matchedOn: "barcode" });
    }

    for (const entry of channelItems) {
        for (const variant of entry.item.variants ?? []) {
            if (variant.id) {
                claim(variant.sku, {
                    entry,
                    variantId: variant.id,
                    matchedOn: "sku",
                });
            }
        }

        claim(entry.item.sku, { entry, matchedOn: "sku" });
        claim(entry.item.code, { entry, matchedOn: "code" });
    }

    return index;
}

export function matchScan(
    index: ScanIndex,
    code: string,
): ScanMatch | undefined {
    return index.get(normalize(code));
}

export function variantOf(match: ScanMatch) {
    if (!match.variantId) {
        return undefined;
    }

    return match.entry.item.variants?.find(
        (variant) => variant.id === match.variantId,
    );
}
