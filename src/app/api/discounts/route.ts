import { NextRequest } from "next/server";
import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import { pageQueryParams, toPageResult } from "@/lib/api/pagination";
import type { DiscountResponse } from "@/lib/api/discount";

export async function GET(request: NextRequest) {
  try {
    const businessId = await getCurrentBusinessId();
    const searchParams = new URL(request.url).searchParams;
    const params = pageQueryParams(searchParams);

    const page = await backendRequest<{
      content: DiscountResponse[];
      number: number;
      size: number;
      totalElements: number;
      totalPages: number;
    }>(`/api/v1/businesses/${businessId}/discounts?${params.toString()}`);

    return Response.json(toPageResult(page));
  } catch (error) {
    return backendErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const businessId = await getCurrentBusinessId();
    const body = await readJsonBody(request);

    const discount = await backendRequest<DiscountResponse>(
      `/api/v1/businesses/${businessId}/discounts`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

    return Response.json(discount, { status: 201 });
  } catch (error) {
    return backendErrorResponse(error);
  }
}
