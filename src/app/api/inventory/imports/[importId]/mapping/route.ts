import { backendErrorResponse, backendRequest, readJsonBody } from "@/lib/api/backend";
import { importPath, type ImportRouteContext } from "@/lib/api/data-import-backend";
import { inventoryValidationError } from "@/lib/api/inventory-backend";
import { importMappingSchema, type ImportJob } from "@/lib/api/data-import";

export async function PUT(request: Request, context: ImportRouteContext) {
    try {
        const result = importMappingSchema.safeParse(await readJsonBody(request));

        if (!result.success) {
            return inventoryValidationError(result.error);
        }

        /*
         * A column the user cleared arrives as null. The backend reads a
         * missing entry and a null one the same way — as a column it ignores —
         * so the nulls are dropped rather than sent.
         */
        const mappings = Object.fromEntries(
            Object.entries(result.data.mappings).filter(([, field]) => Boolean(field)),
        );

        const job = await backendRequest<ImportJob>(await importPath(context, "/mapping"), {
            method: "PUT",
            body: JSON.stringify({ ...result.data, mappings }),
        });

        return Response.json(job);
    } catch (error) {
        return backendErrorResponse(error);
    }
}
