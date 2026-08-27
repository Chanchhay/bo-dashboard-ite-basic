import { backendErrorResponse, backendResponse } from "@/lib/api/backend";
import { getInventoryBusinessId } from "@/lib/api/inventory-backend";
import { IMPORT_TARGET_TYPES, type ImportTargetType } from "@/lib/api/data-import";

/**
 * Hands back a blank file with the right column headings.
 *
 * A static segment, so Next.js matches it ahead of `[importId]` rather than
 * treating "template" as an import to look up.
 *
 * The body is forwarded rather than read: it is a file on its way to someone's
 * downloads folder, and this hop exists to attach the shop's identity and the
 * access token. The backend's own `Content-Disposition` is passed along with
 * it, which is what makes the browser save the file instead of showing it.
 */
export async function GET(request: Request) {
    try {
        const targetType = new URL(request.url).searchParams.get(
            "targetType",
        ) as ImportTargetType | null;

        if (!targetType || !IMPORT_TARGET_TYPES.includes(targetType)) {
            return Response.json(
                { message: "Choose what kind of template you need." },
                { status: 400 },
            );
        }

        const businessId = await getInventoryBusinessId();
        const response = await backendResponse(
            `/api/v1/businesses/${businessId}/imports/template?targetType=${encodeURIComponent(targetType)}`,
            { headers: { Accept: "text/csv" } },
        );

        return new Response(response.body, {
            status: response.status,
            headers: {
                "Cache-Control": "private, no-store",
                "Content-Disposition":
                    response.headers.get("Content-Disposition") ??
                    'attachment; filename="fluxibiz-import-template.csv"',
                "Content-Type": response.headers.get("Content-Type") ?? "text/csv; charset=utf-8",
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
