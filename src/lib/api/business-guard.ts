import { cache } from "react";
import { redirect } from "next/navigation";

import { BackendApiError, backendRequest } from "@/lib/api/backend";
import {
    NO_BUSINESS_LOGIN_URL,
    UNVERIFIED_LOGIN_URL,
    isNoBusinessError,
} from "@/lib/api/no-business";

type BusinessCheck = "confirmed" | "none" | "unverified";

const checkBusiness = cache(async (): Promise<BusinessCheck> => {
    try {
        const business = await backendRequest<{ id?: string } | undefined>(
            "/api/v1/businesses/me",
        );

        return business?.id ? "confirmed" : "none";
    } catch (error) {
        if (!(error instanceof BackendApiError)) throw error;

        if (isNoBusinessError(error.status, error.message)) {
            return "none";
        }

        console.error(
            "[business-guard] could not verify the account's business:",
            `${error.status} ${error.message}`,
        );

        return "unverified";
    }
});

export async function requireBusiness() {
    const check = await checkBusiness();

    if (check === "confirmed") return;

    redirect(check === "none" ? NO_BUSINESS_LOGIN_URL : UNVERIFIED_LOGIN_URL);
}
