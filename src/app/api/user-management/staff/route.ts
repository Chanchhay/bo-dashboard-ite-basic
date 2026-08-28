import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import {
    getCurrentBusinessId,
    validationErrorResponse,
} from "@/lib/api/business-backend";
import { pageQueryParams, toPageResult } from "@/lib/api/pagination";
import {
    createStaffSchema,
    toStaffRequest,
    type Staff,
} from "@/lib/api/user-management";

export async function GET(request: Request) {
    try {
        const businessId = await getCurrentBusinessId();
        const searchParams = new URL(request.url).searchParams;
        const params = pageQueryParams(searchParams);

        const page = await backendRequest<{
            content: Staff[];
            page: number;
            size: number;
            totalElements: number;
            totalPages: number;
        }>(`/api/v1/businesses/${businessId}/staff?${params.toString()}`);

        return Response.json(toPageResult(page, searchParams));
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