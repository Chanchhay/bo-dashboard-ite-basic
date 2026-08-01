import { randomInt } from "node:crypto";

import {
    backendErrorResponse,
} from "@/lib/api/backend";
import {
    getInventoryBusinessId,
    getInventoryItemsPage,
} from "@/lib/api/inventory-backend";

const generationAttempts = 50;

function createEan13Barcode() {
    const body = [
        randomInt(1, 10),
        ...Array.from({ length: 11 }, () => randomInt(0, 10)),
    ].join("");
    const sum = [...body].reduce(
        (total, digit, index) =>
            total + Number(digit) * (index % 2 === 0 ? 1 : 3),
        0,
    );
    const checkDigit = (10 - (sum % 10)) % 10;

    return `${body}${checkDigit}`;
}

export async function POST() {
    try {
        const businessId = await getInventoryBusinessId();

        for (let attempt = 0; attempt < generationAttempts; attempt += 1) {
            const barcode = createEan13Barcode();
            const matches = await getInventoryItemsPage(businessId, {
                page: 0,
                size: 1,
                sort: "name,asc",
                barcode,
            });

            if (!(matches.content ?? []).length) {
                return Response.json({ barcode });
            }
        }

        return Response.json(
            { message: "Unable to generate an unused barcode. Try again." },
            { status: 503 },
        );
    } catch (error) {
        return backendErrorResponse(error);
    }
}
