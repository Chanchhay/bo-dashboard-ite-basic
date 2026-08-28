import { backendErrorResponse } from "@/lib/api/backend";
import { startImportWork, type ImportRouteContext } from "@/lib/api/data-import-backend";
import { type ImportJob } from "@/lib/api/data-import";

/**
 * Takes a committed import back out of the catalogue.
 *
 * Only what the import created, and only what nothing has been sold from. The
 * backend refuses a second undo of the same import, so two tabs cannot both
 * start deleting the same shelf.
 */
export async function POST(_request: Request, context: ImportRouteContext) {
    try {
        return Response.json(await startImportWork<ImportJob>(context, "/revert"));
    } catch (error) {
        return backendErrorResponse(error);
    }
}
