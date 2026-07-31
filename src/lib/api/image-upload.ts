/**
 * One description of what an image picker accepts, shared by the control that
 * picks the file and the route handler that forwards it — so the browser, the
 * client check and the server check can never drift apart, and every picker in
 * the app rejects a file with the same sentence.
 */
export type ImageUploadRules = {
    /** For the file input's `accept`. */
    accept: string;
    maxBytes: number;
    /** One line of guidance to render under the picker. */
    hint: string;
    /** The message to show, or `undefined` when the file is fine. */
    validate: (file: File) => string | undefined;
};

function formatBytes(bytes: number) {
    return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function capitalize(text: string) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

export function imageUploadRules({
    accept,
    maxBytes,
    subject,
    formats,
}: {
    accept: string;
    maxBytes: number;
    /** Lowercase and article-first: "the logo", "your profile picture". */
    subject: string;
    /** Human-readable formats for the hint: "PNG, JPG or WebP". */
    formats: string;
}): ImageUploadRules {
    const limit = formatBytes(maxBytes);

    return {
        accept,
        maxBytes,
        hint: `${formats} up to ${limit}.`,
        validate: (file) => {
            if (!file.type.startsWith("image/")) {
                return `Choose an image file for ${subject}.`;
            }

            if (file.size > maxBytes) {
                return `${capitalize(subject)} must be ${limit} or smaller.`;
            }

            return undefined;
        },
    };
}
