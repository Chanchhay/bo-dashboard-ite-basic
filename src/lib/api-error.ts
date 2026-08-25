/**
 * Pulls the backend's `message` out of an RTK Query error, if there is one.
 *
 * `duplicate` renames the one backend message no reader can act on: a unique
 * constraint reaches the client as "duplicate key", which names a database
 * object rather than the thing the reader typed. Only the screen that hit it
 * knows what was duplicated, so only that screen supplies the wording.
 *
 * Nothing else is rewritten. This used to turn every database error at all
 * into "this phone number or email is already registered", which meant a
 * broken query anywhere in the app was reported to the user — and to whoever
 * they told — as a duplicate customer.
 */
/**
 * Checks if an error is a 403 Forbidden / Access Denied error.
 */
export function isForbiddenError(error: unknown): boolean {
    if (typeof error === "object" && error !== null) {
        if ("status" in error) {
            const status = (error as { status: unknown }).status;
            if (status === 403 || status === "403") return true;
        }
        if (
            "data" in error &&
            typeof (error as { data: unknown }).data === "object" &&
            (error as { data: unknown }).data !== null
        ) {
            const data = (error as { data: Record<string, unknown> }).data;
            if (data.status === 403 || data.status === "403") return true;
            if (
                typeof data.message === "string" &&
                (data.message.includes("403") || data.message.toLowerCase().includes("forbidden"))
            ) {
                return true;
            }
        }
        if (
            "message" in error &&
            typeof (error as { message: unknown }).message === "string"
        ) {
            const msg = (error as { message: string }).message;
            if (msg.includes("403") || msg.toLowerCase().includes("forbidden")) return true;
        }
    }
    return false;
}

export function getApiErrorMessage(
    error: unknown,
    fallback: string,
    duplicate?: string,
) {
    if (isForbiddenError(error)) {
        return "Access Forbidden — You do not have permission to access this resource.";
    }

    if (
        typeof error === "object" &&
        error !== null &&
        "data" in error &&
        typeof error.data === "object" &&
        error.data !== null &&
        "message" in error.data &&
        typeof error.data.message === "string"
    ) {
        const msg = error.data.message;

        if (duplicate && msg.toLowerCase().includes("duplicate key")) {
            return duplicate;
        }

        return msg;
    }

    return fallback;
}

/**
 * Whether the backend answered with a message of its own, rather than the
 * request failing to reach it. Screens use this to decide between explaining
 * what the server said and pointing at the connection.
 */
export function hasApiErrorMessage(error: unknown) {
    return (
        typeof error === "object" &&
        error !== null &&
        "data" in error &&
        typeof error.data === "object" &&
        error.data !== null &&
        "message" in error.data &&
        typeof error.data.message === "string" &&
        error.data.message.trim().length > 0
    );
}

export type FieldErrors = Record<string, string[] | undefined>;

/** Zod field errors returned by the route handlers on a 400. */
export function getApiFieldErrors(error: unknown): FieldErrors {
    if (
        typeof error === "object" &&
        error !== null &&
        "data" in error &&
        typeof error.data === "object" &&
        error.data !== null &&
        "fieldErrors" in error.data &&
        typeof error.data.fieldErrors === "object" &&
        error.data.fieldErrors !== null
    ) {
        return error.data.fieldErrors as FieldErrors;
    }

    return {};
}
