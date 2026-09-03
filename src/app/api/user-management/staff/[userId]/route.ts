import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import {
    getCurrentBusinessId,
    validationErrorResponse,
} from "@/lib/api/business-backend";
import {
    toStaffRequest,
    updateStaffSchema,
    type Staff,
} from "@/lib/api/user-management";

type StaffRouteContext = {
    params: Promise<{ userId: string }>;
};

export async function GET(_request: Request, context: StaffRouteContext) {
    try {
        const [{ userId }, businessId] = await Promise.all([
            context.params,
            getCurrentBusinessId(),
        ]);
        const staff = await backendRequest<Staff>(
            `/api/v1/businesses/${businessId}/staff/${encodeURIComponent(userId)}`,
        );

        return Response.json(staff);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function PUT(request: Request, context: StaffRouteContext) {
    try {
        const result = updateStaffSchema.safeParse(await readJsonBody(request));

        if (!result.success) {
            return validationErrorResponse(
                result.error,
                "Check the submitted user information.",
            );
        }

        const [{ userId }, businessId] = await Promise.all([
            context.params,
            getCurrentBusinessId(),
        ]);
        await backendRequest<void>(
            `/api/v1/businesses/${businessId}/staff/${encodeURIComponent(userId)}`,
            {
                method: "PUT",
                body: JSON.stringify(toStaffRequest(result.data)),
            },
        );

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function DELETE(_request: Request, context: StaffRouteContext) {
    try {
        const [{ userId }, businessId] = await Promise.all([
            context.params,
            getCurrentBusinessId(),
        ]);
        await backendRequest<void>(
            `/api/v1/businesses/${businessId}/staff/${encodeURIComponent(userId)}`,
            { method: "DELETE" },
        );

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
