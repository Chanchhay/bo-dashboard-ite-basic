import { backendErrorResponse, backendRequest } from "@/lib/api/backend";
import { getInventoryBusinessId } from "@/lib/api/inventory-backend";
import { toPageResult } from "@/lib/api/pagination";
import {
    importFileError,
    type ImportJob,
    type ImportTargetType,
} from "@/lib/api/data-import";

type SpringPage<T> = {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
};

/**
 * The `PageResponse` envelope the backend uses puts the page index on `page`,
 * where Spring's own `Page` puts it on `number`. Everything on this side reads
 * the latter, so it is renamed on the way through.
 */
function toPage<T>(response: SpringPage<T>) {
    return toPageResult({
        content: response.content,
        number: response.page,
        size: response.size,
        totalElements: response.totalElements,
        totalPages: response.totalPages,
    });
}

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const params = new URLSearchParams();
        params.set("page", url.searchParams.get("page") ?? "0");
        params.set("size", url.searchParams.get("size") ?? "20");

        const status = url.searchParams.get("status");
        if (status) params.set("status", status);

        const businessId = await getInventoryBusinessId();
        const page = await backendRequest<SpringPage<ImportJob>>(
            `/api/v1/businesses/${businessId}/imports?${params}`,
        );

        return Response.json(toPage(page));
    } catch (error) {
        return backendErrorResponse(error);
    }
}

/**
 * Takes the file and asks the backend to read its headings.
 *
 * The file is forwarded as a stream rather than buffered here — this hop
 * exists to attach the shop's identity and the access token, not to inspect a
 * spreadsheet.
 */
export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");
        const targetType = String(formData.get("targetType") ?? "") as ImportTargetType;

        if (!(file instanceof File)) {
            return Response.json({ message: "Choose a file to import." }, { status: 400 });
        }

        const fileError = importFileError(file);

        if (fileError) {
            return Response.json({ message: fileError }, { status: 400 });
        }

        if (!targetType) {
            return Response.json(
                { message: "Choose what you are importing." },
                { status: 400 },
            );
        }

        const businessId = await getInventoryBusinessId();
        const upload = new FormData();
        upload.append("file", file, file.name);

        const job = await backendRequest<ImportJob>(
            `/api/v1/businesses/${businessId}/imports?targetType=${encodeURIComponent(targetType)}`,
            { method: "POST", body: upload },
        );

        return Response.json(job, { status: 201 });
    } catch (error) {
        return backendErrorResponse(error);
    }
}
