import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import {
  getInventoryBusinessId,
  inventoryValidationError,
} from "@/lib/api/inventory-backend";
import { unwrapList } from "@/lib/api/pagination";
import {
  addOnSetSchema,
  toAddOnSetRequest,
  type AddOnSet,
} from "@/lib/api/inventory";

type AddOnSetList = AddOnSet[] | { content: AddOnSet[] };

export async function GET() {
  try {
    const businessId = await getInventoryBusinessId();
    const sets = await backendRequest<AddOnSetList>(
      `/api/v1/businesses/${businessId}/add-on-sets?size=1000`,
    );

    return Response.json(unwrapList(sets));
  } catch (error) {
    return backendErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const result = addOnSetSchema.safeParse(await request.json());

    if (!result.success) {
      return inventoryValidationError(result.error);
    }

    const businessId = await getInventoryBusinessId();
    const set = await backendRequest<AddOnSet>(
      `/api/v1/businesses/${businessId}/add-on-sets`,
      {
        method: "POST",
        body: JSON.stringify(toAddOnSetRequest(result.data)),
      },
    );

    return Response.json(set, { status: 201 });
  } catch (error) {
    return backendErrorResponse(error);
  }
}
