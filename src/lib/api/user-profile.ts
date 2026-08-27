import { z } from "zod";

import { imageUploadRules } from "@/lib/api/image-upload";

export const userProfileGenders = [
    "MALE",
    "FEMALE",
    "OTHER",
    "UNSPECIFIED",
] as const;

export type UserProfileGender = (typeof userProfileGenders)[number];

export type UserProfile = {
    userId?: string;
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    gender?: string;
    role?: string;
    address?: string;
    profilePicture?: string;
};

const optionalPhoneSchema = z
    .string()
    .trim()
    .refine(
        (value) =>
            !value ||
            (value.length >= 8 &&
                value.length <= 30 &&
                /^\+?[0-9 ]+$/.test(value)),
        "Use 8–30 characters containing only numbers, spaces, and an optional +.",
    );

export const profilePictureRules = imageUploadRules({
    accept: "image/png,image/jpeg,image/webp",
    maxBytes: 5 * 1024 * 1024,
    subject: "your profile picture",
    formats: "PNG, JPG or WebP",
});

export const userProfileSchema = z.object({
    firstName: z
        .string()
        .trim()
        .max(255, "First name must be 255 characters or fewer."),
    lastName: z
        .string()
        .trim()
        .max(255, "Last name must be 255 characters or fewer."),
    phoneNumber: optionalPhoneSchema,
    gender: z.enum(userProfileGenders),
    address: z.string().trim(),
});

export type UserProfileInput = z.infer<typeof userProfileSchema>;

export type UserProfileUpdate = UserProfileInput & { file?: File | null };

export function toUserProfileFormData(
    input: UserProfileInput,
    file?: File | null,
) {
    const formData = new FormData();

    for (const [name, value] of Object.entries(input)) {
        formData.append(name, value);
    }

    
    
    if (file) {
        formData.append("file", file, file.name);
    }

    return formData;
}
