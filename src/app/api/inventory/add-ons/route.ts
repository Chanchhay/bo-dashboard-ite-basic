import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import {
  getInventoryBusinessId,
  inventoryValidationError,
} from "@/lib/api/inventory-backend";
import { unwrapList } from "@/lib/api/pagination";
import { addOnSchema, toAddOnRequest, type AddOn } from "@/lib/api/inventory";

export async function GET() {
  try {
    const businessId = await getInventoryBusinessId();
    const addOns = await backendRequest<AddOn[] | { content: AddOn[] }>(
      `/api/v1/businesses/${businessId}/add-ons?size=1000`,
    );

    return Response.json(unwrapList(addOns));
  } catch (error) {
    return backendErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const result = addOnSchema.safeParse(await readJsonBody(request));

    if (!result.success) {
      return inventoryValidationError(result.error);
    }

    const businessId = await getInventoryBusinessId();
    const addOn = await backendRequest<AddOn>(
      `/api/v1/businesses/${businessId}/add-ons`,
      {
        method: "POST",
        body: JSON.stringify(toAddOnRequest(result.data)),
      },
    );

    return Response.json(addOn, { status: 201 });
  } catch (error) {
    return backendErrorResponse(error);
  }
}
