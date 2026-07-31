import { z } from "zod";

import { imageUploadRules } from "@/lib/api/image-upload";

export type BusinessSubCategory = {
    id?: string;
    name?: string;
    slug?: string;
};

export type BusinessCategory = {
    id?: string;
    name?: string;
    slug?: string;
    subCategories?: BusinessSubCategory[];
};

export type Business = {
    id: string;
    slug?: string;
    name?: string;
    logo?: string;
    thumbnail?: string;
    about?: string;
    phoneNumber?: string;
    googleMap?: string;
    address?: string;
    cityOrProvince?: string;
    website?: string;
    email?: string;
    category?: BusinessSubCategory;
    baseCurrency?: string;
    displayCurrency?: string;
};

const optionalEmailSchema = z
    .string()
    .trim()
    .max(255, "Email must be 255 characters or fewer.")
    .refine(
        (value) => !value || z.email().safeParse(value).success,
        "Enter a valid email address.",
    );

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

export const businessProfileSchema = z.object({
    name: z
        .string()
        .trim()
        .min(1, "Legal name is required.")
        .max(200, "Legal name must be 200 characters or fewer."),
    categoryId: z.string().trim(),
    about: z
        .string()
        .trim()
        .max(255, "Description must be 255 characters or fewer."),
    email: optionalEmailSchema,
    website: z
        .string()
        .trim()
        .max(255, "Website must be 255 characters or fewer."),
    phoneNumber: optionalPhoneSchema,
    address: z
        .string()
        .trim()
        .max(255, "Address must be 255 characters or fewer."),
    googleMap: z
        .string()
        .trim()
        .max(255, "Google Map URL must be 255 characters or fewer."),
});

/** Matches the backend's upload limits for `POST /businesses/{id}/logo`. */
export const businessLogoRules = imageUploadRules({
    accept: "image/png,image/jpeg,image/webp,image/svg+xml",
    maxBytes: 5 * 1024 * 1024,
    subject: "the logo",
    formats: "PNG, JPG, WebP or SVG",
});

/** The storefront cover, behind `POST /businesses/{id}/thumbnail`. */
export const businessThumbnailRules = imageUploadRules({
    accept: "image/png,image/jpeg,image/webp",
    maxBytes: 5 * 1024 * 1024,
    subject: "the cover image",
    formats: "PNG, JPG or WebP",
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;

// `UpdateBusinessRequest` carries no logo: the image is owned by the
// `/logo` upload and delete endpoints instead.
export type UpdateBusinessInput = {
    name: string;
    categoryId?: string;
    email?: string;
    address: string;
    about: string;
    phoneNumber?: string;
    googleMap: string;
    website: string;
};

export function toUpdateBusinessInput(
    input: BusinessProfileInput,
): UpdateBusinessInput {
    return {
        name: input.name,
        about: input.about,
        address: input.address,
        googleMap: input.googleMap,
        website: input.website,
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        ...(input.email ? { email: input.email } : {}),
        ...(input.phoneNumber ? { phoneNumber: input.phoneNumber } : {}),
    };
}
