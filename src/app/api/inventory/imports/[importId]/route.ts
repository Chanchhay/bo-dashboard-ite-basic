import { backendErrorResponse } from "@/lib/api/backend";
import { readImport, type ImportRouteContext } from "@/lib/api/data-import-backend";
import { type ImportJob } from "@/lib/api/data-import";

export async function GET(_request: Request, context: ImportRouteContext) {
    try {
        return Response.json(await readImport<ImportJob>(context));
    } catch (error) {
        return backendErrorResponse(error);
    }
}
