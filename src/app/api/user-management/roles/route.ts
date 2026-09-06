import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import {
  getCurrentBusinessId,
  validationErrorResponse,
} from "@/lib/api/business-backend";
import { pageQueryParams, toPageResult } from "@/lib/api/pagination";
import {
  businessRoleSchema,
  type BusinessRole,
} from "@/lib/api/user-management";

export async function GET(request: Request) {
  try {
    const businessId = await getCurrentBusinessId();
    const searchParams = new URL(request.url).searchParams;
    const params = pageQueryParams(searchParams);

    const page = await backendRequest<{
      content: BusinessRole[];
      number: number;
      size: number;
      totalElements: number;
      totalPages: number;
    }>(`/api/v1/businesses/${businessId}/roles?${params.toString()}`);

    return Response.json(toPageResult(page));
  } catch (error) {
    return backendErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const result = businessRoleSchema.safeParse(await readJsonBody(request));

    if (!result.success) {
      return validationErrorResponse(
        result.error,
        "Check the submitted role information.",
      );
    }

    const businessId = await getCurrentBusinessId();
    await backendRequest<void>(`/api/v1/businesses/${businessId}/roles`, {
      method: "POST",
      body: JSON.stringify(result.data),
    });

    return new Response(null, { status: 201 });
  } catch (error) {
    return backendErrorResponse(error);
  }
}
