import { cache } from "react";
import { redirect } from "next/navigation";

import { BackendApiError, backendRequest } from "@/lib/api/backend";
import { NO_BUSINESS_LOGIN_URL, isNoBusinessError } from "@/lib/api/no-business";

/**
 * Whether the signed-in account has a business at all, as the backend sees it.
 *
 * `cache` keeps it to one call per request no matter how many layouts ask.
 * Anything other than the no-business answer — a backend that is down, a
 * token that failed to refresh — counts as "yes": those are the dashboard's
 * own errors to report, and refusing entry over them would lock everyone out
 * whenever the API hiccups.
 */
const hasBusiness = cache(async () => {
    try {
        await backendRequest("/api/v1/businesses/me");
        return true;
    } catch (error) {
        return !(
            error instanceof BackendApiError &&
            isNoBusinessError(error.status, error.message)
        );
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
    if (await hasBusiness()) return;

    // The session is deliberately left alone: it is still a valid sign-in for
    // the administrator app. The middleware lets /login through on this query.
    redirect(NO_BUSINESS_LOGIN_URL);
}
