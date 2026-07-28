import { z } from "zod";

import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import {
    userProfileSchema,
    type UserProfile,
} from "@/lib/api/user-profile";

const userProfilePath = "/api/v1/user-profiles/me";

export async function GET() {
    try {
        const profile = await backendRequest<UserProfile>(userProfilePath);
        return Response.json(profile);
    } catch (error) {
        return backendErrorResponse(error);
    }
}

export async function PATCH(request: Request) {
    try {
        const result = userProfileSchema.safeParse(await request.json());

        if (!result.success) {
            return Response.json(
                {
                    message: "Check the submitted user profile.",
                    fieldErrors: z.flattenError(result.error).fieldErrors,
                },
                { status: 400 },
            );
        }

        const profile = await backendRequest<UserProfile>(userProfilePath, {
            method: "PATCH",
            body: JSON.stringify(result.data),
        });

        return Response.json(profile);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
