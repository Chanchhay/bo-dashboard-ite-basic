import { backendErrorResponse } from "@/lib/api/backend";
import { startImportWork, type ImportRouteContext } from "@/lib/api/data-import-backend";
import { type ImportJob } from "@/lib/api/data-import";

/** Starts checking. The answer says it has begun, not what it found. */
export async function POST(_request: Request, context: ImportRouteContext) {
    try {
        return Response.json(await startImportWork<ImportJob>(context, "/validate"));
    } catch (error) {
        return backendErrorResponse(error);
    }
}
