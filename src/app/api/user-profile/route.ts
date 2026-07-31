import { z } from "zod";

import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import {
    getProfilePictureError,
    toUserProfileFormData,
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
        const formData = await request.formData();
        const result = userProfileSchema.safeParse({
            firstName: String(formData.get("firstName") || ""),
            lastName: String(formData.get("lastName") || ""),
            phoneNumber: String(formData.get("phoneNumber") || ""),
            gender: String(formData.get("gender") || "UNSPECIFIED"),
            address: String(formData.get("address") || ""),
        });

        if (!result.success) {
            return Response.json(
                {
                    message: "Check the submitted user profile.",
                    fieldErrors: z.flattenError(result.error).fieldErrors,
                },
                { status: 400 },
            );
        }

        const picture = formData.get("file");
        const file =
            picture instanceof File && picture.size > 0 ? picture : null;

        if (file) {
            const fileError = getProfilePictureError(file);

            if (fileError) {
                return Response.json(
                    { message: fileError, fieldErrors: { file: [fileError] } },
                    { status: 400 },
                );
            }
        }

        // Rebuild the payload so only the parts the backend declares are
        // forwarded, whatever else the browser sent.
        const profile = await backendRequest<UserProfile>(userProfilePath, {
            method: "PATCH",
            body: toUserProfileFormData(result.data, file),
        });

        return Response.json(profile);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
