import { NextRequest } from "next/server";
import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import type { MembershipTypeResponse } from "@/lib/api/membership-type";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ membershipTypeId: string }> },
) {
    try {
        const { membershipTypeId } = await params;
        const businessId = await getCurrentBusinessId();
        const type = await backendRequest<MembershipTypeResponse>(
            `/api/v1/businesses/${businessId}/membership-types/${membershipTypeId}`,
        );

        return Response.json(type);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ membershipTypeId: string }> },
) {
    try {
        const { membershipTypeId } = await params;
        const businessId = await getCurrentBusinessId();
        const body = await request.json();

        const type = await backendRequest<MembershipTypeResponse>(
            `/api/v1/businesses/${businessId}/membership-types/${membershipTypeId}`,
            {
                method: "PUT",
                body: JSON.stringify(body),
            },
        );

        return Response.json(type);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ membershipTypeId: string }> },
) {
    try {
        const { membershipTypeId } = await params;
        const businessId = await getCurrentBusinessId();

        await backendRequest<void>(
            `/api/v1/businesses/${businessId}/membership-types/${membershipTypeId}`,
            { method: "DELETE" },
        );

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
