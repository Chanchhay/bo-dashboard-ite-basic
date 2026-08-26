import { z } from "zod";

import { imageUploadRules } from "@/lib/api/image-upload";

export type BusinessSubCategory = {
    id?: string;
    name?: string;
    slug?: string;
};

export type TaxInclusionType = "INCLUSIVE" | "EXCLUSIVE";

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
    /** @deprecated superseded by {@link provinceName}; still returned during the transition. */
    cityOrProvince?: string;
    /**
     * Province/city, district/khan, commune/sangkat — filled in from a map
     * geocoder when the owner drops the pin, not typed by hand. Plain text
     * rather than an id: nobody here maintains a seeded division table.
     */
    provinceName?: string;
    districtName?: string;
    communeName?: string;
    /** The shopfront's exact map pin, same source as the names above. */
    latitude?: number;
    longitude?: number;
    website?: string;
    email?: string;
    category?: BusinessSubCategory;
    baseCurrency?: string;
    displayCurrency?: string;
    /** The one tax rate this business charges — applied the same way on every sales channel. */
    taxEnabled?: boolean;
    taxRate?: number;
    taxInclusionType?: TaxInclusionType;
    taxLabel?: string;
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

/** Cambodia's bounding box, padded — catches a mis-dropped pin, not a precise fence. */
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

/** Sale Management's Tax Settings page — a separate save from the general
 * business profile, since it lives on its own page there. */
export const taxSettingsSchema = z.object({
    taxEnabled: z.boolean(),
    taxRate: z
        .string()
        .trim()
        .refine(
            (value) =>
                value === "" ||
                (!Number.isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 100),
            "Tax rate must be a number between 0 and 100.",
        ),
    taxInclusionType: z.enum(["INCLUSIVE", "EXCLUSIVE"]),
    taxLabel: z
        .string()
        .trim()
        .max(30, "Tax label must be 30 characters or fewer."),
});

export type TaxSettingsInput = z.infer<typeof taxSettingsSchema>;

/** Same `UpdateBusinessRequest` endpoint, but with only the tax fields set —
 * every other field stays null so nothing else on the profile is touched. */
export type UpdateBusinessTaxInput = {
    taxEnabled: boolean;
    taxRate?: number;
    taxInclusionType: TaxInclusionType;
    taxLabel?: string;
};

export function toUpdateBusinessTaxInput(
    input: TaxSettingsInput,
): UpdateBusinessTaxInput {
    return {
        taxEnabled: input.taxEnabled,
        taxInclusionType: input.taxInclusionType,
        ...(input.taxRate !== "" ? { taxRate: Number(input.taxRate) } : {}),
        ...(input.taxLabel ? { taxLabel: input.taxLabel } : {}),
    };
}