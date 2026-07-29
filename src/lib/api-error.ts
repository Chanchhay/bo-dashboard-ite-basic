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
        return error.data.message;
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
