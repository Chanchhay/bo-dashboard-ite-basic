import { NextRequest } from "next/server";
import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { MembershipTypeResponse } from "@/lib/api/membership-type";

export async function PATCH(
    _request: NextRequest,
    { params }: { params: Promise<{ membershipTypeId: string }> },
) {
    try {
        const { membershipTypeId } = await params;
        const businessId = await getCurrentBusinessId();
        const type = await backendRequest<MembershipTypeResponse>(
            `/api/v1/businesses/${businessId}/membership-types/${membershipTypeId}/activate`,
            { method: "PATCH" },
        );

        return Response.json(type);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
