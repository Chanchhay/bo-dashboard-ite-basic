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
    toItemFormData,
    type InventoryItem,
    type InventoryItemPage,
    type InventoryItemQuery,
} from "@/lib/api/inventory";

export const getInventoryBusinessId = getCurrentBusinessId;

const inventoryFilterKeys = [
    "keyword",
    "status",
    "itemGroupId",
    "unitId",
    "itemType",
    "minPrice",
    "maxPrice",
    "sku",
    "barcode",
] as const satisfies readonly (keyof InventoryItemQuery)[];

/** Builds either the paged list URL or the typed item-search URL. */
export function inventoryItemsBackendPath(
    businessId: string,
    query: InventoryItemQuery,
) {
    const searchParams = new URLSearchParams({
        page: String(query.page),
        size: String(query.size),
        sort: query.sort,
    });

    let hasFilters = false;

    for (const key of inventoryFilterKeys) {
        const value = query[key];

        if (value !== undefined && value !== "") {
            searchParams.set(key, String(value));
            hasFilters = true;
        }
    }

    const resource = hasFilters ? "items/search" : "items";

    return `/api/v1/businesses/${businessId}/${resource}?${searchParams.toString()}`;
}

export async function getInventoryItemsPage(
    businessId: string,
    query: InventoryItemQuery,
) {
    return backendRequest<InventoryItemPage>(
        inventoryItemsBackendPath(businessId, query),
    );
}

/**
 * Server-rendered summaries still need the whole catalogue. Walk the new
 * paged endpoint in bounded chunks instead of assuming GET items is an array.
 */
export async function getAllInventoryItems(businessId: string) {
    const size = 100;
    const firstPage = await getInventoryItemsPage(businessId, {
        page: 0,
        size,
        sort: "name,asc",
    });
    const totalPages = Math.max(firstPage.page?.totalPages ?? 1, 1);

    if (totalPages === 1) {
        return firstPage.content ?? [];
    }

    const items: InventoryItem[] = [...(firstPage.content ?? [])];

    for (let page = 1; page < totalPages; page += 1) {
        const response = await getInventoryItemsPage(businessId, {
            page,
            size,
            sort: "name,asc",
        });
        items.push(...(response.content ?? []));
    }

    return items;
}

export function inventoryValidationError(error: z.ZodError) {
    return validationErrorResponse(
        error,
        "Check the submitted inventory information.",
    );
}

/**
 * Pulls the `files` parts out of a request and checks them the way the backend
 * does, so a bad pick fails before the upload is forwarded.
 */
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

/** Keeps barcode PNG bytes and the Keycloak token on the server-side BFF. */
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

/**
 * Reads a save posted by the item form: the fields as one JSON part named
 * `item`, plus any newly picked images as `files` parts. The fields stay JSON
 * on this hop so they can be validated as an object; only the body forwarded
 * to the backend is flattened into the indexed parts its binder wants.
 */
export async function readItemSave(request: Request) {
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
        body: toItemFormData(result.data, files),
        item: result.data,
    };
}
