import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import {
    getCurrentBusinessId,
    validationErrorResponse,
} from "@/lib/api/business-backend";
import {
    businessRoleSchema,
    type BusinessRole,
} from "@/lib/api/user-management";

export async function GET() {
    try {
        const businessId = await getCurrentBusinessId();
        const roles = await backendRequest<BusinessRole[]>(
            `/api/v1/businesses/${businessId}/roles`,
        );

        return Response.json(roles);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const result = businessRoleSchema.safeParse(await request.json());

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
