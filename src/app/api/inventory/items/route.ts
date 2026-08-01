import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import {
    getInventoryItemsPage,
    getInventoryBusinessId,
    readItemSave,
} from "@/lib/api/inventory-backend";
import {
    inventoryItemQuerySchema,
    type InventoryItem,
} from "@/lib/api/inventory";

export async function GET(request: Request) {
    try {
        const incoming = new URL(request.url).searchParams;
        const result = inventoryItemQuerySchema.safeParse({
            page: incoming.get("page") ?? undefined,
            size: incoming.get("size") ?? undefined,
            sort: incoming.get("sort") ?? undefined,
            keyword: incoming.get("keyword") ?? undefined,
            status: incoming.get("status") ?? undefined,
            itemGroupId: incoming.get("itemGroupId") ?? undefined,
            unitId: incoming.get("unitId") ?? undefined,
            itemType: incoming.get("itemType") ?? undefined,
            minPrice: incoming.get("minPrice") ?? undefined,
            maxPrice: incoming.get("maxPrice") ?? undefined,
            sku: incoming.get("sku") ?? undefined,
            barcode: incoming.get("barcode") ?? undefined,
        });

        if (!result.success) {
            return Response.json(
                {
                    message:
                        result.error.issues[0]?.message ||
                        "Check the item filters and try again.",
                },
                { status: 400 },
            );
        }

        const businessId = await getInventoryBusinessId();
        const items = await getInventoryItemsPage(businessId, result.data);

        return Response.json(items);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const { body, error, item: input } = await readItemSave(request);

        if (error) {
            return error;
        }

        const businessId = await getInventoryBusinessId();
        const barcode = input?.barcode.trim();

        if (barcode) {
            const matches = await getInventoryItemsPage(businessId, {
                page: 0,
                size: 1,
                sort: "name,asc",
                barcode,
            });
            const duplicate = (matches.content ?? []).some(
                (item) => item.barcode?.trim() === barcode,
            );

            if (duplicate) {
                return Response.json(
                    {
                        message:
                            "That barcode is already assigned to another item. Generate a new one.",
                    },
                    { status: 409 },
                );
            }
        }

        const item = await backendRequest<InventoryItem>(
            `/api/v1/businesses/${businessId}/items`,
            { method: "POST", body },
        );

        return Response.json(item, { status: 201 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
