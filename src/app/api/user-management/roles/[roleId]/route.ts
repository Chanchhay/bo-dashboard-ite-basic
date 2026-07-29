import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import {
    getCurrentBusinessId,
    validationErrorResponse,
} from "@/lib/api/business-backend";
import { businessRoleSchema } from "@/lib/api/user-management";

type RoleRouteContext = {
    params: Promise<{ roleId: string }>;
};

export async function PUT(request: Request, context: RoleRouteContext) {
    try {
        const result = businessRoleSchema.safeParse(await request.json());

        if (!result.success) {
            return validationErrorResponse(
                result.error,
                "Check the submitted role information.",
            );
        }

        const [{ roleId }, businessId] = await Promise.all([
            context.params,
            getCurrentBusinessId(),
        ]);
        await backendRequest<void>(
            `/api/v1/businesses/${businessId}/roles/${encodeURIComponent(roleId)}`,
            {
                method: "PUT",
                body: JSON.stringify(result.data),
            },
        );

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function DELETE(_request: Request, context: RoleRouteContext) {
    try {
        const [{ roleId }, businessId] = await Promise.all([
            context.params,
            getCurrentBusinessId(),
        ]);
        await backendRequest<void>(
            `/api/v1/businesses/${businessId}/roles/${encodeURIComponent(roleId)}`,
            { method: "DELETE" },
        );

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
