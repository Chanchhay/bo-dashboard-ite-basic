import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import {
    getCurrentBusinessId,
    validationErrorResponse,
} from "@/lib/api/business-backend";
import {
    createStaffSchema,
    toStaffRequest,
    type Staff,
} from "@/lib/api/user-management";

export async function GET() {
    try {
        const businessId = await getCurrentBusinessId();
        const staff = await backendRequest<Staff[]>(
            `/api/v1/businesses/${businessId}/staff`,
        );

        return Response.json(staff);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        const result = createStaffSchema.safeParse(await request.json());

        if (!result.success) {
            return validationErrorResponse(
                result.error,
                "Check the submitted user information.",
            );
        }

        const businessId = await getCurrentBusinessId();
        await backendRequest<void>(`/api/v1/businesses/${businessId}/staff`, {
            method: "POST",
            body: JSON.stringify(toStaffRequest(result.data)),
        });

        return new Response(null, { status: 201 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
