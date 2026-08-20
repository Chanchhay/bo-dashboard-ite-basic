/** Pulls the backend's `message` out of an RTK Query error, if there is one. */
export function getApiErrorMessage(error: unknown, fallback: string) {
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
        if (
            msg.toLowerCase().includes("database operation failed") ||
            msg.toLowerCase().includes("duplicate key") ||
            msg.toLowerCase().includes("data integrity violation")
        ) {
            return "This phone number or email is already registered to another customer.";
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
