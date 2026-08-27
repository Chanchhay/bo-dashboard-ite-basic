import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import {
    importPath,
    toImportPage,
    type ImportRouteContext,
    type SpringPage,
} from "@/lib/api/data-import-backend";
import { type ImportRow } from "@/lib/api/data-import";

/** The rows that went wrong, whether refused at checking or at import. */
export async function GET(request: Request, context: ImportRouteContext) {
    try {
        const url = new URL(request.url);
        const params = new URLSearchParams();
        params.set("page", url.searchParams.get("page") ?? "0");
        params.set("size", url.searchParams.get("size") ?? "25");

        const page = await backendRequest<SpringPage<ImportRow>>(
            `${await importPath(context, "/errors")}?${params}`,
        );

        return Response.json(toImportPage(page));
    } catch (error) {
        return backendErrorResponse(error);
    }
}
