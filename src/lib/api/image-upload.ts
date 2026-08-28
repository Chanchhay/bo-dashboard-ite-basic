
export type ImageUploadRules = {
    
    accept: string;
    maxBytes: number;
    
    hint: string;
    
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
    
    subject: string;
    
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
