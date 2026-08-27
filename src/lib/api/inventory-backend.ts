import { z } from "zod";

import { backendRequest, backendResponse } from "@/lib/api/backend";
import {
    getCurrentBusinessId,
    validationErrorResponse,
} from "@/lib/api/business-backend";
import {
    inventoryItemSchema,
    itemImageRules,
    maxItemImages,
    toItemMultipart,
    type InventoryItem,
    type InventoryItemInput,
    type InventoryItemPage,
    type InventoryItemQuery,
    type MultipartPayload,
} from "@/lib/api/inventory";

export const getInventoryBusinessId = getCurrentBusinessId;

export function inventoryItemsBackendPath(businessId: string) {
    return `/api/v1/businesses/${businessId}/items`;
}


export async function getAllInventoryItems(businessId: string) {
    const items = await backendRequest<InventoryItem[] | InventoryItemPage>(
        inventoryItemsBackendPath(businessId),
    );

    
    if (Array.isArray(items)) return items;

    return items?.content ?? [];
}

function matchesQuery(item: InventoryItem, query: InventoryItemQuery) {
    const keyword = query.keyword?.trim().toLowerCase();

    if (keyword) {
        const haystack = [item.name, item.code, item.sku, item.barcode]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        if (!haystack.includes(keyword)) return false;
    }

    if (query.status && item.status !== query.status) return false;
    if (query.itemType && item.itemType !== query.itemType) return false;
    if (query.itemGroupId && item.itemGroup?.id !== query.itemGroupId) {
        return false;
    }
    if (query.unitId && item.unit?.id !== query.unitId) return false;

    
    if (query.minPrice !== undefined) {
        if (item.price == null || item.price < query.minPrice) return false;
    }
    if (query.maxPrice !== undefined) {
        if (item.price == null || item.price > query.maxPrice) return false;
    }

    if (query.sku && item.sku?.trim() !== query.sku.trim()) return false;
    if (query.barcode && item.barcode?.trim() !== query.barcode.trim()) {
        return false;
    }

    return true;
}

function compareItems(sort: InventoryItemQuery["sort"]) {
    const [field, direction] = sort.split(",") as ["name" | "price", "asc" | "desc"];
    const sign = direction === "desc" ? -1 : 1;

    return (a: InventoryItem, b: InventoryItem) => {
        if (field === "price") {
            return ((a.price ?? 0) - (b.price ?? 0)) * sign;
        }

        return (a.name ?? "").localeCompare(b.name ?? "") * sign;
    };
}


export async function getInventoryItemsPage(
    businessId: string,
    query: InventoryItemQuery,
): Promise<InventoryItemPage> {
    const all = await getAllInventoryItems(businessId);

    const matched = all
        .filter((item) => matchesQuery(item, query))
        .sort(compareItems(query.sort));

    const size = Math.max(query.size, 1);
    const totalPages = Math.max(Math.ceil(matched.length / size), 1);
    
    const number = Math.min(Math.max(query.page, 0), totalPages - 1);
    const start = number * size;

    return {
        content: matched.slice(start, start + size),
        page: {
            size,
            number,
            totalElements: matched.length,
            totalPages,
        },
    };
}

export function inventoryValidationError(error: z.ZodError) {
    return validationErrorResponse(
        error,
        "Check the submitted inventory information.",
    );
}


export function readItemImageFiles(formData: FormData) {
    const files = formData
        .getAll("files")
        .filter((part): part is File => part instanceof File && part.size > 0);

    if (files.length > maxItemImages) {
        return {
            files,
            error: `An item can have at most ${maxItemImages} images.`,
        };
    }

    for (const file of files) {
        const fileError = itemImageRules.validate(file);

        if (fileError) {
            return { files, error: fileError };
        }
    }

    return { files, error: undefined };
}

export function itemImageError(message: string) {
    return Response.json({ message }, { status: 400 });
}


export async function inventoryBarcodeImageResponse(
    backendPath: string,
    filename: string,
) {
    const response = await backendResponse(backendPath, {
        headers: { Accept: "image/png" },
    });

    return new Response(response.body, {
        status: response.status,
        headers: {
            "Cache-Control": "private, no-store",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Content-Type": response.headers.get("Content-Type") || "image/png",
            "X-Content-Type-Options": "nosniff",
        },
    });
}


export type ItemSave =
    | { error: Response; save?: undefined }
    | {
          error?: undefined;
          save: MultipartPayload & { item: InventoryItemInput };
      };

export async function readItemSave(request: Request): Promise<ItemSave> {
    const formData = await request.formData();
    let fields: unknown;

    try {
        fields = JSON.parse(String(formData.get("item") ?? ""));
    } catch {
        return {
            error: itemImageError("The submitted item could not be read."),
        };
    }

    const result = inventoryItemSchema.safeParse(fields);

    if (!result.success) {
        return { error: inventoryValidationError(result.error) };
    }

    const { files, error } = readItemImageFiles(formData);

    if (error) {
        return { error: itemImageError(error) };
    }

    return {
        save: { ...toItemMultipart(result.data, files), item: result.data },
    };
}
