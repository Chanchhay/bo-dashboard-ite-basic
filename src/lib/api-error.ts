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
export function getApiErrorMessage(
    error: unknown,
    fallback: string,
    duplicate?: string,
) {
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
