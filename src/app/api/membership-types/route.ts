import { NextRequest } from "next/server";
import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import { unwrapList } from "@/lib/api/pagination";
import type { MembershipTypeResponse } from "@/lib/api/membership-type";

type MembershipTypeList =
  | MembershipTypeResponse[]
  | { content: MembershipTypeResponse[] };

export async function GET() {
  try {
    const businessId = await getCurrentBusinessId();
    const types = await backendRequest<MembershipTypeList>(
      `/api/v1/businesses/${businessId}/membership-types?size=1000`,
    );

    return Response.json(unwrapList(types));
  } catch (error) {
    return backendErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const businessId = await getCurrentBusinessId();
    const body = await request.json();

    const type = await backendRequest<MembershipTypeResponse>(
      `/api/v1/businesses/${businessId}/membership-types`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

    return Response.json(type, { status: 201 });
  } catch (error) {
    return backendErrorResponse(error);
  }
}
