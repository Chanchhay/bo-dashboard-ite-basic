import { backendErrorResponse } from "@/lib/api/backend";
import { startImportWork, type ImportRouteContext } from "@/lib/api/data-import-backend";
import { type ImportJob } from "@/lib/api/data-import";

/**
 * Brings the checked rows into the catalogue.
 *
 * The backend refuses a second one, so a double click costs a conflict rather
 * than a duplicated catalogue — but the screen disables the button as well,
 * because a shopkeeper should not have to find that out.
 */
export async function POST(_request: Request, context: ImportRouteContext) {
    try {
        return Response.json(await startImportWork<ImportJob>(context, "/commit"));
    } catch (error) {
        return backendErrorResponse(error);
    }
}
