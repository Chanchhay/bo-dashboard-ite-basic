/**
 * What a line was sold as, in one phrase.
 *
 * The till, the receipt and the customer screen all have to say the same
 * thing about the same line — three wordings of "6 Pack" is how a customer
 * ends up arguing with a cashier about whether they got what they paid for.
 *
 * Structural rather than tied to one line type: the same line reaches these
 * screens as an order item, a receipt item and a display payload, and none of
 * them is worth converting just to name it.
 */
export function soldAsLabel(line: {
    variantName?: string | null;
    unitName?: string | null;
    unitFactor?: number | null;
}) {
    // A unit that holds one is the base unit, which is just "the item" — saying
    // "Can of 1" beside every single would be noise on every line.
    const packed = line.unitName && (line.unitFactor ?? 1) > 1;

    return [
        line.variantName,
        packed ? `${line.unitName} of ${line.unitFactor}` : null,
    ]
        .filter(Boolean)
        .join(" · ");
}
