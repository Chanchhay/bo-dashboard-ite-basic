import { cookies } from "next/headers";

import { BackendApiError, backendRequest } from "@/lib/api/backend";
import { getCurrentBusinessId } from "@/lib/api/business-backend";
import {
    POS_ORDER_COOKIE,
    type PosOrder,
    type PosOrderPage,
} from "@/lib/api/pos-order";

export function ordersPath(businessId: string, suffix = "") {
    return `/api/v1/businesses/${businessId}/orders${suffix}`;
}


export type OrderFilter = {
    column: string;
    value: string;
    operation: string;
};


type BackendOrderPage = {
    content?: PosOrder[];
    page?: number | Partial<PosOrderPage["page"]>;
    number?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
};

function normalisePage(
    result: BackendOrderPage,
    requested: { page: number; size: number },
): PosOrderPage["page"] {
    const nested =
        typeof result.page === "object" && result.page !== null
            ? result.page
            : null;
    const index =
        nested?.number ??
        (typeof result.page === "number" ? result.page : result.number) ??
        requested.page;
    const size = nested?.size ?? result.size ?? requested.size;
    const totalElements =
        nested?.totalElements ??
        result.totalElements ??
        (result.content?.length ?? 0);

    return {
        size,
        number: index,
        totalElements,
        totalPages:
            nested?.totalPages ??
            result.totalPages ??
            Math.ceil(totalElements / Math.max(size, 1)),
    };
}


export async function filterOrders(
    businessId: string,
    filters: OrderFilter[],
    pageable: { page: number; size: number },
): Promise<PosOrderPage> {
    const result = await backendRequest<BackendOrderPage>(
        `${ordersPath(businessId, "/filter")}?page=${pageable.page}&size=${pageable.size}&sort=createdDate,desc`,
        {
            method: "POST",
            body: JSON.stringify({
                searchRequestDto: filters,
                globalOperator: "AND",
            }),
        },
    );

    return {
        content: result.content ?? [],
        page: normalisePage(result, pageable),
    };
}


const ORDER_COOKIE_MAX_AGE = 60 * 60 * 16;

export async function rememberOrder(orderId: string) {
    const cookieStore = await cookies();

    cookieStore.set(POS_ORDER_COOKIE, orderId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: ORDER_COOKIE_MAX_AGE,
    });
}

export async function forgetOrder() {
    const cookieStore = await cookies();
    cookieStore.delete(POS_ORDER_COOKIE);
}

export async function readOrderId() {
    const cookieStore = await cookies();
    return cookieStore.get(POS_ORDER_COOKIE)?.value;
}


export async function getCurrentOrder(): Promise<PosOrder | null> {
    const orderId = await readOrderId();

    if (!orderId) return null;

    const businessId = await getCurrentBusinessId();

    try {
        const order = await backendRequest<PosOrder>(
            ordersPath(businessId, `/${encodeURIComponent(orderId)}`),
        );

        if (order.status !== "PENDING") {
            await forgetOrder();
            return null;
        }

        return order;
    } catch (error) {
        
        if (
            error instanceof BackendApiError &&
            (error.status === 404 || error.status === 400)
        ) {
            await forgetOrder();
            return null;
        }

        throw error;
    }
}


export async function ensureCurrentOrder(businessId: string) {
    const existing = await getCurrentOrder();

    if (existing) return existing;

    const order = await backendRequest<PosOrder>(ordersPath(businessId), {
        method: "POST",
        body: JSON.stringify({ channel: "POS", items: [] }),
    });

    await rememberOrder(order.id);

    return order;
}
