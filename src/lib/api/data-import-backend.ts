import { backendRequest } from "@/lib/api/backend";
import { getInventoryBusinessId } from "@/lib/api/inventory-backend";
import { toPageResult } from "@/lib/api/pagination";

type SpringPage<T> = {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
};

/**
 * The backend's `PageResponse` envelope puts the page index on `page`; Spring's
 * own `Page`, which everything on this side reads, puts it on `number`. Renamed
 * once here rather than at each of the routes that pages.
 */
export function toImportPage<T>(response: SpringPage<T>) {
    return toPageResult({
        content: response.content,
        number: response.page,
        size: response.size,
        totalElements: response.totalElements,
        totalPages: response.totalPages,
    });
}

export type ImportRouteContext = {
    params: Promise<{ importId: string }>;
};

/**
 * The backend path for one import, with the shop resolved from the session.
 *
 * The import id arrives from the browser, so it is escaped rather than
 * trusted; the business id never does. Nothing in the browser is ever told
 * where the uploaded file physically lives.
 */
export async function importPath(context: ImportRouteContext, suffix = "") {
    const [{ importId }, businessId] = await Promise.all([
        context.params,
        getInventoryBusinessId(),
    ]);

    return `/api/v1/businesses/${businessId}/imports/${encodeURIComponent(importId)}${suffix}`;
}

/** A plain GET on one of an import's sub-resources. */
export async function readImport<T>(context: ImportRouteContext, suffix = "") {
    return backendRequest<T>(await importPath(context, suffix));
}

/** A POST that starts background work and answers with the job. */
export async function startImportWork<T>(context: ImportRouteContext, suffix: string) {
    return backendRequest<T>(await importPath(context, suffix), { method: "POST" });
}

export type { SpringPage };
