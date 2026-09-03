import { unwrapList } from "@/lib/api/pagination";
import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import {
  getInventoryBusinessId,
  inventoryValidationError,
} from "@/lib/api/inventory-backend";
import {
  itemGroupSchema,
  toItemGroupRequest,
  type ItemGroup,
  type ItemSubGroup,
} from "@/lib/api/inventory";

export async function GET() {
  try {
    const businessId = await getInventoryBusinessId();
    const groups = await backendRequest<ItemGroup[] | { content: ItemGroup[] }>(
      `/api/v1/businesses/${businessId}/item-groups?size=1000`,
    );

    return Response.json(unwrapList(groups));
  } catch (error) {
    return backendErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const result = itemGroupSchema.safeParse(await readJsonBody(request));

    if (!result.success) {
      return inventoryValidationError(result.error);
    }

    const businessId = await getInventoryBusinessId();
    const group = await backendRequest<ItemSubGroup>(
      `/api/v1/businesses/${businessId}/item-groups`,
      {
        method: "POST",
        body: JSON.stringify(toItemGroupRequest(result.data)),
      },
    );

    return Response.json(group, { status: 201 });
  } catch (error) {
    return backendErrorResponse(error);
  }
}
