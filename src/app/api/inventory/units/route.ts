import { unwrapList } from "@/lib/api/pagination";
import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import {
  getInventoryBusinessId,
  inventoryValidationError,
} from "@/lib/api/inventory-backend";
import { toUnitRequest, unitSchema, type Unit } from "@/lib/api/inventory";

export async function GET() {
  try {
    const businessId = await getInventoryBusinessId();
    const units = await backendRequest<Unit[] | { content: Unit[] }>(
      `/api/v1/businesses/${businessId}/units?size=1000`,
    );

    return Response.json(unwrapList(units));
  } catch (error) {
    return backendErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const result = unitSchema.safeParse(await readJsonBody(request));

    if (!result.success) {
      return inventoryValidationError(result.error);
    }

    const businessId = await getInventoryBusinessId();
    const unit = await backendRequest<Unit>(
      `/api/v1/businesses/${businessId}/units`,
      {
        method: "POST",
        body: JSON.stringify(toUnitRequest(result.data)),
      },
    );

    return Response.json(unit, { status: 201 });
  } catch (error) {
    return backendErrorResponse(error);
  }
}
