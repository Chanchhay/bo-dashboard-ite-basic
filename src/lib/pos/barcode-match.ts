import type { ChannelItem } from "@/lib/api/sales-channels";

/**
 * What a scanned code resolves to on the till.
 *
 * The list the till already holds is the whole search: the POS channel's items
 * are in memory, and a scan has to land before the cashier's hand comes back
 * off the scanner. A round trip is only worth making when nothing matches —
 * and then only to tell the cashier *why* (see the caller).
 */

export type ScanMatch = {
    entry: ChannelItem;
    /** Set when the code was an option's own, so the till never has to ask. */
    variantId?: string;
    /** How the code was recognised, for the message when something blocks it. */
    matchedOn: "barcode" | "sku" | "code";
};

export type ScanIndex = Map<string, ScanMatch>;

function normalize(value: string | null | undefined) {
    return value?.trim().toLocaleLowerCase() ?? "";
}

/**
 * Codes to what they sell, most specific first.
 *
 * An option's barcode beats the item's: a bottle of Large has its own label,
 * and scanning it should ring up Large rather than reopen the question. SKUs
 * and item codes are indexed behind the barcodes because plenty of shops print
 * the SKU on the shelf label and scan that instead — but a real barcode always
 * wins the key.
 */
export function buildScanIndex(channelItems: ChannelItem[]): ScanIndex {
    const index: ScanIndex = new Map();

    function claim(code: string | null | undefined, match: ScanMatch) {
        const key = normalize(code);

        if (key && !index.has(key)) {
            index.set(key, match);
        }
    }

    // Two passes so priority is the order of the passes rather than the order
    // the items happen to arrive in.
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

/** The option a scan named, if it named one. */
export function variantOf(match: ScanMatch) {
    if (!match.variantId) {
        return undefined;
    }

    return match.entry.item.variants?.find(
        (variant) => variant.id === match.variantId,
    );
}
