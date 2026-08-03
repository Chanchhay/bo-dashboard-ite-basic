import { z } from "zod";

export const bakongAccountTypes = ["INDIVIDUAL", "MERCHANT"] as const;

export type BakongAccountType = (typeof bakongAccountTypes)[number];

/**
 * What the backend reports back.
 *
 * There is no `apiToken` here by design: the token is write-only, and only
 * whether one exists comes back. Never render a placeholder that could pass
 * for the real secret.
 */
export type BakongSettings = {
    id?: string;
    businessId?: string;
    accountType?: BakongAccountType;
    bakongAccountId?: string;
    merchantName?: string;
    merchantCity?: string;
    merchantId?: string;
    acquiringBank?: string;
    mobileNumber?: string;
    storeLabel?: string;
    apiTokenConfigured?: boolean;
    active?: boolean;
};

/** `configured` is false when the business has never set Bakong up. */
export type BakongState = {
    configured: boolean;
    settings: BakongSettings | null;
};

const optionalText = (max: number) =>
    z.preprocess(
        (value) => (value === "" ? undefined : value),
        z.string().trim().max(max).optional(),
    );

export const bakongSettingsSchema = z.object({
    accountType: z.enum(bakongAccountTypes, {
        message: "Choose an account type.",
    }),
    bakongAccountId: z
        .string()
        .trim()
        .min(1, "Enter your Bakong account ID.")
        .max(120),
    merchantName: z
        .string()
        .trim()
        .min(1, "Enter the name customers should see.")
        .max(120),
    merchantCity: z.string().trim().min(1, "Enter the city.").max(120),
    merchantId: optionalText(120),
    acquiringBank: optionalText(120),
    mobileNumber: optionalText(40),
    storeLabel: optionalText(120),
    /**
     * Omitted rather than sent empty when the merchant isn't replacing it —
     * an empty string would wipe a working token and break KHQR silently.
     */
    apiToken: optionalText(500),
});

export type BakongSettingsInput = z.infer<typeof bakongSettingsSchema>;

export const khqrPreviewSchema = z.object({
    amount: z.coerce
        .number({ message: "Enter an amount." })
        .positive("Amount must be greater than zero."),
    currency: z.string().trim().max(10).optional(),
    billNumber: z.string().trim().max(60).optional(),
    terminalLabel: z.string().trim().max(60).optional(),
});

export type KhqrPreviewInput = z.infer<typeof khqrPreviewSchema>;

/** Blank form values, used before anything has been configured. */
export const emptyBakongSettings: BakongSettingsInput = {
    accountType: "INDIVIDUAL",
    bakongAccountId: "",
    merchantName: "",
    merchantCity: "",
    merchantId: undefined,
    acquiringBank: undefined,
    mobileNumber: undefined,
    storeLabel: undefined,
    apiToken: undefined,
};
