/**
 * The backend answers every business-scoped call with a 404 "Business has not
 * been found" when the signed-in account owns no business and is on no staff
 * roster — the state a platform administrator's account is permanently in,
 * since their app is a different one.
 *
 * Surfacing that as a page error left those accounts staring at a failure they
 * cannot act on, so the dashboard sends them back to the login screen instead.
 * The session is deliberately left alone: it is still a valid sign-in, just
 * not one this app has anything to show.
 */

/** Flag `backendErrorResponse` adds so the browser can tell this 404 apart. */
export const NO_BUSINESS_FLAG = "noBusiness";

/**
 * Why a signed-in browser is being shown the login screen instead of the app.
 *
 * `no-business` is the definite answer — the backend was asked and said the
 * account has none. `unavailable` means the question could not be answered at
 * all: the backend refused the token, was down, or replied with something
 * unrecognisable. The two must stay distinct because only the first is the
 * account's normal, permanent state; the second is a fault worth retrying and
 * worth saying out loud rather than dressing up as "you have no business".
 */
export type BlockedReason = "no-business" | "unavailable";

/** Query key the login page and the middleware both read. */
export const BLOCKED_PARAM = "blocked";

export function blockedLoginUrl(reason: BlockedReason) {
    return `/login?${BLOCKED_PARAM}=${reason}`;
}

/** Query the login page reads to explain itself rather than re-running OAuth. */
export const NO_BUSINESS_LOGIN_URL = blockedLoginUrl("no-business");

/** Shown when the business check itself failed, rather than came back empty. */
export const UNVERIFIED_LOGIN_URL = blockedLoginUrl("unavailable");

/** Where Keycloak returns after sign-in; gates the dashboard on a business. */
export const POST_LOGIN_URL = "/api/post-login";

/** Clears this app's session, keeping Keycloak's, then shows the login page. */
export const NO_BUSINESS_SIGN_OUT_URL = "/api/no-business";

/** The reason in a `blocked` query, or null when it is absent or unknown. */
export function blockedReason(value: string | null): BlockedReason | null {
    return value === "no-business" || value === "unavailable" ? value : null;
}

const NO_BUSINESS_MESSAGE = /business has not been found/i;

/** True for the backend error raised by `BusinessHelper.currentBusiness()`. */
export function isNoBusinessError(status: number, message?: string) {
    return status === 404 && !!message && NO_BUSINESS_MESSAGE.test(message);
}

/** True for a response body this app flagged with {@link NO_BUSINESS_FLAG}. */
export function isNoBusinessPayload(payload: unknown) {
    return (
        typeof payload === "object" &&
        payload !== null &&
        (payload as Record<string, unknown>)[NO_BUSINESS_FLAG] === true
    );
}
