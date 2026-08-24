import { backendErrorResponse } from "@/lib/api/backend";
import { getCurrentOrder } from "@/lib/api/pos-order-backend";


export async function GET() {
    try {
        return Response.json(await getCurrentOrder());
    } catch (error) {
        return backendErrorResponse(error);
    }
}
