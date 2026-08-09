import { z } from "zod";

import {
    backendErrorResponse,
    backendRequest,
} from "@/lib/api/backend";
import {
    profilePictureRules,
    userProfileSchema,
    type UserProfile,
    type UserProfileInput,
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
        const contentType = request.headers.get("content-type") || "";
        let payload: UserProfileInput;
        let file: File | null = null;

        if (contentType.includes("multipart/form-data")) {
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

            payload = result.data;
            const picture = formData.get("file");
            if (picture instanceof File && picture.size > 0) {
                file = picture;
            }
        } else {
            const body = await request.json();
            const result = userProfileSchema.safeParse(body);

            if (!result.success) {
                return Response.json(
                    {
                        message: "Check the submitted user profile.",
                        fieldErrors: z.flattenError(result.error).fieldErrors,
                    },
                    { status: 400 },
                );
            }
            payload = result.data;
        }

        if (file) {
            const fileError = profilePictureRules.validate(file);

            if (fileError) {
                return Response.json(
                    { message: fileError, fieldErrors: { file: [fileError] } },
                    { status: 400 },
                );
            }

            // Upload profile picture if provided
            const pictureFormData = new FormData();
            pictureFormData.append("file", file, file.name);
            await backendRequest<void>("/api/v1/user-profiles/me/picture", {
                method: "POST",
                body: pictureFormData,
            }).catch(() => {});
        }

        // Send JSON request body to Spring Boot backend as expected by backend API
        const profile = await backendRequest<UserProfile>(userProfilePath, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        return Response.json(profile);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
