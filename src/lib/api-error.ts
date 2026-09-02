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

/*
 * Words that mean the server is talking to a developer, not to the person at
 * the till.
 *
 * A cashier with a queue does not need a class path, and a customer reading
 * the screen over their shoulder should never see one. Anything matching here
 * is dropped for the caller's own sentence, which at least says what the
 * reader was trying to do.
 */
const TECHNICAL_MARKERS = [
    "exception",
    "stack trace",
    "stacktrace",
    "sqlstate",
    "constraint",
    "org.springframework",
    "java.",
    "jakarta.",
    "hibernate",
    "econnrefused",
    "enotfound",
    "etimedout",
    "fetch failed",
    "socket hang up",
    "internal server error",
    "cannot read propert",
    "is not a function",
    "null pointer",
    "no such column",
    "no such table",
];

function looksTechnical(message: string) {
    const trimmed = message.trim();
    const lower = trimmed.toLowerCase();

    if (TECHNICAL_MARKERS.some((marker) => lower.includes(marker))) return true;

    // A stack frame, a serialised object, or a paragraph. None is a sentence
    // anyone can act on.
    if (/\bat\s+[\w.$]+\s*\(/.test(trimmed)) return true;
    if (/^[{[<]/.test(trimmed)) return true;
    if (trimmed.length > 200) return true;

    return false;
}

function rawApiMessage(error: unknown) {
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

    return undefined;
}

export function getApiErrorMessage(
    error: unknown,
    fallback: string,
    duplicate?: string,
) {
    if (isForbiddenError(error)) {
        return "You do not have permission to do that.";
    }

    const msg = rawApiMessage(error);

    if (msg) {
        if (duplicate && msg.toLowerCase().includes("duplicate key")) {
            return duplicate;
        }

        // The caller's fallback names what the reader was doing; a stack frame
        // names what the server was doing. Only one of those helps.
        if (looksTechnical(msg)) {
            console.error("[api] technical error hidden from the UI:", msg);
            return fallback;
        }

        return msg;
    }

    return fallback;
}

/**
 * Whether the backend answered with something worth repeating, rather than the
 * request failing to reach it — or falling over in its own words.
 *
 * Screens use this to decide between explaining what the server said and
 * pointing at the connection. A stack trace is neither, so it counts as no
 * message at all.
 */
export function hasApiErrorMessage(error: unknown) {
    const message = rawApiMessage(error)?.trim();

    return Boolean(message && !looksTechnical(message));
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
