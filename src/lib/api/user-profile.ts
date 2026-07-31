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

/** The `413` on the profile update is the server's own upload ceiling. */
export const profilePictureRules = imageUploadRules({
    accept: "image/png,image/jpeg,image/webp",
    maxBytes: 5 * 1024 * 1024,
    subject: "your profile picture",
    formats: "PNG, JPG or WebP",
});

// The text half of `UpdateUserProfileRequest`. The picture rides along as the
// request's `file` part, so it is not a field here.
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

/** What the form hands to the mutation: the fields plus an optional picture. */
export type UserProfileUpdate = UserProfileInput & { file?: File | null };

/** `PATCH /user-profiles/me` is multipart, so the fields go in as parts. */
export function toUserProfileFormData(
    input: UserProfileInput,
    file?: File | null,
) {
    const formData = new FormData();

    for (const [name, value] of Object.entries(input)) {
        formData.append(name, value);
    }

    // Left out entirely when unchanged — an absent part keeps the stored
    // picture, an empty one would not.
    if (file) {
        formData.append("file", file, file.name);
    }

    return formData;
}
