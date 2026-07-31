import { ReceiptListItem, ReceiptsSummary, ReceiptDetail } from "@/types/pos-type";

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

const mockReceipts: ReceiptListItem[] = [
  {
    id: "r2",
    ticket_number: "#2",
    sold_at: "2026-07-20T14:13:00",
    cashier_id: "1",
    cashier_name: "Sok Sok",
    item_count: 2,
    method_type: "CASH",
    amount: "115.00",
    status: "PAID",
  },
  {
    id: "r1",
    ticket_number: "#1",
    sold_at: "2026-07-20T14:01:00",
    cashier_id: "1",
    cashier_name: "Sok Sok",
    item_count: 2,
    method_type: "CASH",
    amount: "45.00",
    status: "PAID",
  },
  {
    id: "r4",
    ticket_number: "#4",
    sold_at: "2026-07-20T06:45:00",
    cashier_id: "1",
    cashier_name: "Sok Sok",
    item_count: 3,
    method_type: "CASH",
    amount: "60.00",
    status: "PAID",
  },
  {
    id: "r5",
    ticket_number: "#5",
    sold_at: "2026-07-19T11:20:00",
    cashier_id: "2",
    cashier_name: "Nita Sok",
    item_count: 1,
    method_type: "DIGITAL",
    amount: "70.00",
    status: "PAID",
  },
  {
    id: "r6",
    ticket_number: "#6",
    sold_at: "2026-07-19T15:40:00",
    cashier_id: "2",
    cashier_name: "Nita Sok",
    item_count: 3,
    method_type: "CASH",
    amount: "30.00",
    status: "PAID",
  },
];

// Full detail per receipt — line items included
const mockReceiptDetails: Record<string, ReceiptDetail> = {
  r2: {
    id: "r2",
    ticket_number: "#2",
    sold_at: "2026-07-20T14:13:00",
    cashier_name: "Sok Sok",
    business_name: "FluxiBiz",
    method_type: "CASH",
    received_amount: 120,
    change_amount: 5,
    items: [
      { product_name: "Beef Steak", quantity: 1, unit_price: "50.00", discount_amount: "10.00" },
      { product_name: "Cold Drink", quantity: 5, unit_price: "15.00", discount_amount: "0.00" },
    ],
    subtotal: "125.00",
    discount_amount: "10.00",
    total: "115.00",
    status: "PAID",
  },
  r1: {
    id: "r1",
    ticket_number: "#1",
    sold_at: "2026-07-20T14:01:00",
    cashier_name: "Sok Sok",
    business_name: "FluxiBiz",
    method_type: "CASH",
    received_amount: 50,
    change_amount: 5,
    items: [
      { product_name: "Shoulder Bag", quantity: 1, unit_price: "45.00", discount_amount: "0.00" },
    ],
    subtotal: "45.00",
    discount_amount: "0.00",
    total: "45.00",
    status: "PAID",
  },
  r4: {
    id: "r4",
    ticket_number: "#4",
    sold_at: "2026-07-20T06:45:00",
    cashier_name: "Sok Sok",
    business_name: "FluxiBiz",
    method_type: "CASH",
    received_amount: 60,
    change_amount: 0,
    items: [
      { product_name: "Cold Drink", quantity: 3, unit_price: "3.00", discount_amount: "0.00" },
      { product_name: "Wooden Spoon", quantity: 3, unit_price: "8.00", discount_amount: "0.00" },
      { product_name: "Sea Food", quantity: 1, unit_price: "27.00", discount_amount: "0.00" },
    ],
    subtotal: "60.00",
    discount_amount: "0.00",
    total: "60.00",
    status: "PAID",
  },
  r5: {
    id: "r5",
    ticket_number: "#5",
    sold_at: "2026-07-19T11:20:00",
    cashier_name: "Nita Sok",
    business_name: "FluxiBiz",
    method_type: "DIGITAL",
    received_amount: null,
    change_amount: null,
    items: [
      { product_name: "Shoulder Bag", quantity: 1, unit_price: "70.00", discount_amount: "0.00" },
    ],
    subtotal: "70.00",
    discount_amount: "0.00",
    total: "70.00",
    status: "PAID",
  },
  r6: {
    id: "r6",
    ticket_number: "#6",
    sold_at: "2026-07-19T15:40:00",
    cashier_name: "Nita Sok",
    business_name: "FluxiBiz",
    method_type: "CASH",
    received_amount: 30,
    change_amount: 0,
    items: [
      { product_name: "Cold Drink", quantity: 3, unit_price: "10.00", discount_amount: "0.00" },
    ],
    subtotal: "30.00",
    discount_amount: "0.00",
    total: "30.00",
    status: "PAID",
  },
};

export async function getReceiptDetail(id: string): Promise<ReceiptDetail> {
  await delay();
  const detail = mockReceiptDetails[id];
  if (!detail) throw new Error("Receipt not found");
  return structuredClone(detail);

}

export type GetReceiptsParams = {
  from?: string;
  to?: string;
  cashierId?: string;
  page?: number;
  pageSize?: number;
};

export type GetReceiptsResult = {
  receipts: ReceiptListItem[];
  summary: ReceiptsSummary;
  totalResults: number;
  page: number;
  pageSize: number;
};

export async function getReceipts(
  params: GetReceiptsParams = {}
): Promise<GetReceiptsResult> {
  await delay();
  const { page = 1, pageSize = 10, from, to, cashierId } = params;

  // ថ្ងៃណាលក់បានប៉ុន្មាន — filter by sold_at falling inside [from, to]
  // អ្នកណាលក់បានប៉ុន្មាន — filter by cashier_id
  let receipts = mockReceipts;

  if (from) {
    const fromDate = new Date(from);
    receipts = receipts.filter((r) => new Date(r.sold_at) >= fromDate);
  }
  if (to) {
    const toDate = new Date(to);
    receipts = receipts.filter((r) => new Date(r.sold_at) <= toDate);
  }
  if (cashierId) {
    receipts = receipts.filter((r) => r.cashier_id === cashierId);
  }

  // Summary recalculated from the FILTERED set, not the full list
  const cash = receipts
    .filter((r) => r.method_type === "CASH")
    .reduce((sum, r) => sum + parseFloat(r.amount), 0);
  const card = receipts
    .filter((r) => r.method_type === "DIGITAL")
    .reduce((sum, r) => sum + parseFloat(r.amount), 0);

  return {
    receipts,
    summary: {
      total: (cash + card).toFixed(2),
      cash: cash.toFixed(2),
      card: card.toFixed(2),
      receiptCount: receipts.length,
    },
    totalResults: receipts.length,
    page,
    pageSize,
  };

  // REAL API VERSION:
  // const query = new URLSearchParams({
  //   ...(from && { from }),
  //   ...(to && { to }),
  //   ...(cashierId && { cashierId }),
  //   page: String(page),
  //   pageSize: String(pageSize),
  // });
  // const res = await fetch(`/api/receipts?${query}`);
  // if (!res.ok) throw new Error("Failed to fetch receipts");
  // return res.json();
}