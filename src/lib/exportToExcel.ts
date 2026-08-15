import type { InventoryItem } from "@/lib/api/inventory";

/**
 * Helper to escape fields for CSV format compatible with Microsoft Excel.
 */
function escapeCsvCell(value: string | number | boolean | null | undefined): string {
    if (value === null || value === undefined) {
        return '""';
    }
    const str = String(value);
    // If the cell contains commas, quotes, or newlines, enclose in quotes and escape internal quotes
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
}

export type ExportItemRow = {
    id: string;
    name?: string;
    code?: string;
    sku?: string;
    barcode?: string;
    category?: string;
    itemType?: string;
    status?: string;
    price?: number;
    unit?: string;
    description?: string;
};

/**
 * Export inventory items array to CSV (Excel compatible with UTF-8 BOM).
 */
export function exportItemsToExcel(items: InventoryItem[], categoryMap?: Map<string, string>, unitMap?: Map<string, string>, fileNamePrefix = "inventory_items_export") {
    const headers = [
        "Item ID",
        "Item Name",
        "Code",
        "SKU",
        "Barcode",
        "Category",
        "Type",
        "Status",
        "Price ($)",
        "Unit",
        "Description",
    ];

    const rows = items.map((item) => {
        const categoryName = item.itemGroup?.id
            ? categoryMap?.get(item.itemGroup.id) || item.itemGroup.name || ""
            : item.itemGroup?.name || "";
        const unitName = item.unit?.id
            ? unitMap?.get(item.unit.id) || item.unit.name || ""
            : item.unit?.name || "";

        return [
            item.id,
            item.name || "",
            item.code || "",
            item.sku || "",
            item.barcode || "",
            categoryName,
            item.itemType || "",
            item.status || "",
            item.price != null ? item.price.toFixed(2) : "",
            unitName,
            item.description || "",
        ];
    });

    const csvContent =
        "\uFEFF" + // UTF-8 Byte Order Mark for Excel auto-encoding
        [headers.map(escapeCsvCell).join(",")]
            .concat(rows.map((row) => row.map(escapeCsvCell).join(",")))
            .join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().split("T")[0];

    link.setAttribute("href", url);
    link.setAttribute("download", `${fileNamePrefix}_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
