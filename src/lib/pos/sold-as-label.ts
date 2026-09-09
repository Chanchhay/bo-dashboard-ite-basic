export function soldAsLabel(line: {
    variantName?: string | null;
    unitName?: string | null;
    unitFactor?: number | null;
}) {
    const packed = line.unitName && (line.unitFactor ?? 1) > 1;

    return [
        line.variantName,
        packed ? `${line.unitName} of ${line.unitFactor}` : null,
    ]
        .filter(Boolean)
        .join(" · ");
}
