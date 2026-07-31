import { z } from "zod";

import {
    getCurrentBusinessId,
    validationErrorResponse,
} from "@/lib/api/business-backend";
import {
    inventoryItemSchema,
    itemImageRules,
    maxItemImages,
    toItemFormData,
} from "@/lib/api/inventory";

export const getInventoryBusinessId = getCurrentBusinessId;

export function inventoryValidationError(error: z.ZodError) {
    return validationErrorResponse(
        error,
        "Check the submitted inventory information.",
    );
}

/**
 * Pulls the `files` parts out of a request and checks them the way the backend
 * does, so a bad pick fails before the upload is forwarded.
 */
export function readItemImageFiles(formData: FormData) {
    const files = formData
        .getAll("files")
        .filter((part): part is File => part instanceof File && part.size > 0);

    if (files.length > maxItemImages) {
        return {
            files,
            error: `An item can have at most ${maxItemImages} images.`,
        };
    }

    for (const file of files) {
        const fileError = itemImageRules.validate(file);

        if (fileError) {
            return { files, error: fileError };
        }
    }

    return { files, error: undefined };
}

export function itemImageError(message: string) {
    return Response.json({ message }, { status: 400 });
}

/**
 * Reads a save posted by the item form: the fields as one JSON part named
 * `item`, plus any newly picked images as `files` parts. The fields stay JSON
 * on this hop so they can be validated as an object; only the body forwarded
 * to the backend is flattened into the indexed parts its binder wants.
 */
export async function readItemSave(request: Request) {
    const formData = await request.formData();
    let fields: unknown;

    try {
        fields = JSON.parse(String(formData.get("item") ?? ""));
    } catch {
        return {
            error: itemImageError("The submitted item could not be read."),
        };
    }

    const result = inventoryItemSchema.safeParse(fields);

    if (!result.success) {
        return { error: inventoryValidationError(result.error) };
    }

    const { files, error } = readItemImageFiles(formData);

    if (error) {
        return { error: itemImageError(error) };
    }

    return { body: toItemFormData(result.data, files) };
}
