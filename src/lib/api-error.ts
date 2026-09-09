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

        if (looksTechnical(msg)) {
            console.error("[api] technical error hidden from the UI:", msg);
            return fallback;
        }

        return msg;
    }

    return fallback;
}

export function hasApiErrorMessage(error: unknown) {
    const message = rawApiMessage(error)?.trim();

    return Boolean(message && !looksTechnical(message));
}

export type FieldErrors = Record<string, string[] | undefined>;

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
