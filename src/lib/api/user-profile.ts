import { z } from "zod";

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
    profilePicture: z.string().trim(),
});

export type UserProfileInput = z.infer<typeof userProfileSchema>;
