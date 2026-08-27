import { backendErrorResponse } from "@/lib/api/backend";
import { readImport, type ImportRouteContext } from "@/lib/api/data-import-backend";
import { type ImportPreview } from "@/lib/api/data-import";

export async function GET(_request: Request, context: ImportRouteContext) {
    try {
        return Response.json(await readImport<ImportPreview>(context, "/preview"));
    } catch (error) {
        return backendErrorResponse(error);
    }
}
