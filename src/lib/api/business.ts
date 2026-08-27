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
    
    provinceName?: string;
    districtName?: string;
    communeName?: string;
    
    latitude?: number;
    longitude?: number;
    website?: string;
    email?: string;
    category?: BusinessSubCategory;
    baseCurrency?: string;
    displayCurrency?: string;
};

export type StorefrontRequirement = {
    code: string;
    label: string;
    satisfied: boolean;
    blocking: boolean;
};

export type StorefrontStatus = {
    businessId: string;
    slug?: string;
    storefrontUrl?: string;
    listed: boolean;
    readyToPublish: boolean;
    requirements: StorefrontRequirement[];
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

const coordinateBounds = { latitude: [9, 15], longitude: [102, 108] } as const;

function optionalCoordinateSchema(axis: keyof typeof coordinateBounds, label: string) {
    const [min, max] = coordinateBounds[axis];
    return z
        .string()
        .trim()
        .refine(
            (value) =>
                !value ||
                (!Number.isNaN(Number(value)) &&
                    Number(value) >= min &&
                    Number(value) <= max),
            `Enter a valid ${label} between ${min} and ${max}.`,
        );
}

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
    provinceName: z
        .string()
        .trim()
        .max(150, "Province must be 150 characters or fewer.")
        .optional(),
    districtName: z
        .string()
        .trim()
        .max(150, "District must be 150 characters or fewer.")
        .optional(),
    communeName: z
        .string()
        .trim()
        .max(150, "Commune must be 150 characters or fewer.")
        .optional(),
    latitude: optionalCoordinateSchema("latitude", "latitude"),
    longitude: optionalCoordinateSchema("longitude", "longitude"),
});

export const businessLogoRules = imageUploadRules({
    accept: "image/png,image/jpeg,image/webp,image/svg+xml",
    maxBytes: 5 * 1024 * 1024,
    subject: "the logo",
    formats: "PNG, JPG, WebP or SVG",
});

export const businessThumbnailRules = imageUploadRules({
    accept: "image/png,image/jpeg,image/webp",
    maxBytes: 5 * 1024 * 1024,
    subject: "the cover image",
    formats: "PNG, JPG or WebP",
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;

export type UpdateBusinessInput = {
    name: string;
    categoryId?: string;
    email?: string;
    address: string;
    about: string;
    phoneNumber?: string;
    googleMap: string;
    website: string;
    provinceName?: string;
    districtName?: string;
    communeName?: string;
    latitude?: number;
    longitude?: number;
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
        ...(input.provinceName ? { provinceName: input.provinceName } : {}),
        ...(input.districtName ? { districtName: input.districtName } : {}),
        ...(input.communeName ? { communeName: input.communeName } : {}),
        ...(input.latitude ? { latitude: Number(input.latitude) } : {}),
        ...(input.longitude ? { longitude: Number(input.longitude) } : {}),
    };
}