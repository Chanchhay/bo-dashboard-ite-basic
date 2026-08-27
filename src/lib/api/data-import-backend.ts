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


export async function importPath(context: ImportRouteContext, suffix = "") {
    const [{ importId }, businessId] = await Promise.all([
        context.params,
        getInventoryBusinessId(),
    ]);

    return `/api/v1/businesses/${businessId}/imports/${encodeURIComponent(importId)}${suffix}`;
}


export async function readImport<T>(context: ImportRouteContext, suffix = "") {
    return backendRequest<T>(await importPath(context, suffix));
}


export async function startImportWork<T>(context: ImportRouteContext, suffix: string) {
    return backendRequest<T>(await importPath(context, suffix), { method: "POST" });
}

export type { SpringPage };
