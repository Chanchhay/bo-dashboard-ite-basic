
export const NO_BUSINESS_FLAG = "noBusiness";

export type BlockedReason = "no-business" | "unavailable";

export const BLOCKED_PARAM = "blocked";

export function blockedLoginUrl(reason: BlockedReason) {
    return `/login?${BLOCKED_PARAM}=${reason}`;
}

export const NO_BUSINESS_LOGIN_URL = blockedLoginUrl("no-business");

export const UNVERIFIED_LOGIN_URL = blockedLoginUrl("unavailable");

export const POST_LOGIN_URL = "/api/post-login";

export const NO_BUSINESS_SIGN_OUT_URL = "/api/no-business";

export function blockedReason(value: string | null): BlockedReason | null {
    return value === "no-business" || value === "unavailable" ? value : null;
}

const NO_BUSINESS_MESSAGE = /business has not been found/i;

export function isNoBusinessError(status: number, message?: string) {
    return status === 404 && !!message && NO_BUSINESS_MESSAGE.test(message);
}

export function isNoBusinessPayload(payload: unknown) {
    return (
        typeof payload === "object" &&
        payload !== null &&
        (payload as Record<string, unknown>)[NO_BUSINESS_FLAG] === true
    );
}
