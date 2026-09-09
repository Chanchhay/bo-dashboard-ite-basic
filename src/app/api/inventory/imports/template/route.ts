import { backendErrorResponse, backendResponse } from "@/lib/api/backend";
import { getInventoryBusinessId } from "@/lib/api/inventory-backend";
import { IMPORT_TARGET_TYPES, type ImportTargetType } from "@/lib/api/data-import";

const SPREADSHEET_TYPE =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(request: Request) {
    try {
        const params = new URL(request.url).searchParams;
        const sample = params.get("sample");
        const targetType = params.get("targetType") as ImportTargetType | null;

        const query = sample
            ? `sample=${encodeURIComponent(sample)}`
            : targetType && IMPORT_TARGET_TYPES.includes(targetType)
              ? `targetType=${encodeURIComponent(targetType)}`
              : null;

        if (!query) {
            return Response.json(
                { message: "Choose which sample file you need." },
                { status: 400 },
            );
        }

        const businessId = await getInventoryBusinessId();
        const response = await backendResponse(
            `/api/v1/businesses/${businessId}/imports/template?${query}`,
            { headers: { Accept: SPREADSHEET_TYPE } },
        );

        return new Response(response.body, {
            status: response.status,
            headers: {
                "Cache-Control": "private, no-store",
                "Content-Disposition":
                    response.headers.get("Content-Disposition") ??
                    'attachment; filename="fluxibiz-import-sample.xlsx"',
                "Content-Type": response.headers.get("Content-Type") ?? SPREADSHEET_TYPE,
                "X-Content-Type-Options": "nosniff",
            },
        });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
