import { NextRequest } from "next/server";
import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import { pageQueryParams, toPageResult } from "@/lib/api/pagination";
import type { CustomerResponse } from "@/lib/api/customer";

export async function GET(request: NextRequest) {
  try {
    const businessId = await getCurrentBusinessId();
    const searchParams = new URL(request.url).searchParams;
    const params = pageQueryParams(searchParams);

    const page = await backendRequest<{
      content: CustomerResponse[];
      number: number;
      size: number;
      totalElements: number;
      totalPages: number;
    }>(`/api/v1/businesses/${businessId}/customers?${params.toString()}`);

    return Response.json(toPageResult(page));
  } catch (error) {
    return backendErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const businessId = await getCurrentBusinessId();
    const body = await readJsonBody(request);

    const customer = await backendRequest<CustomerResponse>(
      `/api/v1/businesses/${businessId}/customers`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

    return Response.json(customer, { status: 201 });
  } catch (error) {
    return backendErrorResponse(error);
  }
}
