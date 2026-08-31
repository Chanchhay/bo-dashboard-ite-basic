import { cache } from "react";
import { redirect } from "next/navigation";

import { BackendApiError, backendRequest } from "@/lib/api/backend";
import {
    NO_BUSINESS_LOGIN_URL,
    UNVERIFIED_LOGIN_URL,
    isNoBusinessError,
} from "@/lib/api/no-business";

/**
 * `confirmed` only when the backend returned an actual business. `none` when
 * it was asked and answered that there is none. `unverified` when the question
 * could not be answered — a refused token, a backend that is down, a reply
 * this app does not recognise.
 */
type BusinessCheck = "confirmed" | "none" | "unverified";

/**
 * Whether the signed-in account has a business, as the backend sees it.
 *
 * Deliberately a positive check. This used to return "yes" for everything that
 * was not a recognisable no-business 404, which meant every other outcome —
 * including the empty-bodied 401 the backend returns for a token it will not
 * accept — read as "has a business" and opened the whole app. An account with
 * no business got in whenever anything else went wrong, which is the one thing
 * this guard exists to prevent.
 *
 * `cache` keeps it to one call per request no matter how many layouts ask.
 */
const checkBusiness = cache(async (): Promise<BusinessCheck> => {
    try {
        const business = await backendRequest<{ id?: string } | undefined>(
            "/api/v1/businesses/me",
        );

        // A 2xx with nothing usable in it is not a confirmation.
        return business?.id ? "confirmed" : "none";
    } catch (error) {
        /*
         * Only errors this app raised itself say anything about the account.
         * Anything else is Next's own control flow — the `DynamicServerError`
         * that bails a prerender out to dynamic rendering, above all — and
         * catching it here would bake a redirect into a static page.
         */
        if (!(error instanceof BackendApiError)) throw error;

        if (isNoBusinessError(error.status, error.message)) {
            return "none";
        }

        /*
         * Logged, not swallowed: an outage here now turns people away, so the
         * reason has to be findable in the server log rather than inferred
         * from a login screen.
         */
        console.error(
            "[business-guard] could not verify the account's business:",
            `${error.status} ${error.message}`,
        );

        return "unverified";
    }
});

/**
 * Server-side gate for every signed-in area of the app.
 *
 * The realm keeps one SSO session per browser, so an administrator signed into
 * the administrator app is silently signed in here too — with no business
 * behind the account and nothing any of these screens can render. The check at
 * /api/post-login catches that at sign-in; this catches every other way in,
 * including a business that disappears while a tab is open.
 *
 * Await it in a layout, before rendering anything the account cannot use.
 */
export async function requireBusiness() {
    const check = await checkBusiness();

    if (check === "confirmed") return;

    /*
     * Both outcomes stop here. Letting an unverified account through is what
     * the old fail-open did, and a business app has nothing it can safely show
     * to an account it cannot confirm. The session is left alone either way:
     * it is still a valid sign-in, for the administrator app or for a retry.
     */
    redirect(check === "none" ? NO_BUSINESS_LOGIN_URL : UNVERIFIED_LOGIN_URL);
}
