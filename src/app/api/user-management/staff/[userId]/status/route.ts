import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import {
    getCurrentBusinessId,
    validationErrorResponse,
} from "@/lib/api/business-backend";
import { staffStatusSchema } from "@/lib/api/user-management";

type StaffRouteContext = {
    params: Promise<{ userId: string }>;
};

export async function PATCH(request: Request, context: StaffRouteContext) {
    try {
        const result = staffStatusSchema.safeParse(await readJsonBody(request));

        if (!result.success) {
            return validationErrorResponse(
                result.error,
                "Check the submitted status.",
            );
        }

        const [{ userId }, businessId] = await Promise.all([
            context.params,
            getCurrentBusinessId(),
        ]);
        await backendRequest<void>(
            `/api/v1/businesses/${businessId}/staff/${encodeURIComponent(userId)}/status`,
            {
                method: "PATCH",
                body: JSON.stringify(result.data),
            },
        );

        return new Response(null, { status: 204 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
