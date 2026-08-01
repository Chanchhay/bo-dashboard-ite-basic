"use client";

import { useState } from "react";
import { ShoppingCart, X } from "lucide-react";

import type { Order, Product } from "@/types/pos-type";

import { formatCurrency, toNumber } from "@/lib/money";
import { PaidReceiptView } from "@/components/pos/order/pain-receipt-view";
import PosCard from "@/components/pos/pos-card";
import { ReceiptDetailView } from "@/components/pos/order/receipt-detail-view";
import { ReceiptsList } from "@/components/pos/order/receipt-list";
import { OrdersList } from "@/components/pos/order/order-list";
import PosButton from "@/components/pos/pos-button";
import { OrderTable } from "@/components/pos/order/order-table";

const TABS_WITH_CART = ["Point of Sale", "Order"];

type PaidReceiptState = {
  order: Order;
  method: "CASH" | "DIGITAL";
  receivedAmount?: number;
};

export function PosScreen() {
  const [activeTab, setActiveTab] = useState("Point of Sale");
  const [openReceiptId, setOpenReceiptId] = useState<string | null>(null);
  const [paidReceipt, setPaidReceipt] = useState<PaidReceiptState | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const products: Product[] = [];
  const isLoading = false;
  const addProduct = async (id: string) => {
    void id;
  };
  const currentOrder: Order = {
    id: "",
    business_owner_id: "",
    invoice_number: null,
    customer_id: null,
    cashier_id: null,
    channel: "POS",
    status: "PENDING",
    subtotal: "0",
    discount_amount: "0",
    applied_discounts: null,
    total: "0",
    currency: "",
    note: null,
    comment: null,
    created_at: "",
    updated_at: null,
    items: [],
  };
  const clearOrder = async () => ({});
  const showCart = TABS_WITH_CART.includes(activeTab);
  const itemCount =
    currentOrder.items.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = toNumber(currentOrder?.total);
  const [isEditingOrder, setIsEditingOrder] = useState(false);

  const handleSaveEdit = async () => {
    try {
      await clearOrder();
      setIsEditingOrder(false);
      setActiveTab("Order");
    } catch (e) {
      console.error("Failed to finish editing order", e);
    }
  };

  const handlePaymentSuccess = async (
    order: Order,
    method: "CASH" | "DIGITAL",
    receivedAmount?: number,
  ) => {
    setPaidReceipt({ order, method, receivedAmount });
    setActiveTab("Point of Sale");
    setMobileCartOpen(false);
    setIsEditingOrder(false);

    try {
      await clearOrder();
    } catch (e) {
      console.error("Failed to reset cart after payment", e);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background min-[1025px]:flex-row">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="scrollbar-none flex-1 overflow-y-auto pb-20 [-ms-overflow-style:none] min-[1025px]:pb-0 [&::-webkit-scrollbar]:hidden">
          {activeTab === "Point of Sale" &&
            (paidReceipt ? (
              <PaidReceiptView
                order={paidReceipt.order}
                paymentMethod={paidReceipt.method}
                receivedAmount={paidReceipt.receivedAmount}
                onNewOrder={() => setPaidReceipt(null)}
              />
            ) : (
              <div className="px-3 pt-4 sm:px-6 sm:pt-6">
                {isLoading ? (
                  <div className="text-sm text-gray-400">
                    Loading products...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 place-items-center gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 min-[900px]:grid-cols-5 min-[1025px]:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {products.map((product) => (
                      <PosCard
                        key={product.id}
                        product={product}
                        onSelect={(id) => addProduct(id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}

          {activeTab === "Order" && (
            <OrdersList
              onEdit={() => {
                setIsEditingOrder(true);
                setActiveTab("Point of Sale");
              }}
            />
          )}

          {activeTab === "Receipts" &&
            (openReceiptId ? (
              <ReceiptDetailView
                receiptId={openReceiptId}
                onBack={() => setOpenReceiptId(null)}
              />
            ) : (
              <ReceiptsList onOpenReceipt={setOpenReceiptId} />
            ))}
        </div>

        <PosButton
          onChange={(tab) => {
            setActiveTab(tab);
            setOpenReceiptId(null);
          }}
        />
      </div>

      {showCart && (
        <div className="scrollbar-hide hidden w-150 shrink-0 overflow-y-auto border-l border-gray-200 bg-white min-[1025px]:flex min-[1025px]:flex-col">
          <OrderTable
            onPaymentSuccess={handlePaymentSuccess}
            isEditingOrder={isEditingOrder}
            onSaveEdit={handleSaveEdit}
          />
        </div>
      )}

      {showCart && !mobileCartOpen && itemCount > 0 && (
        <button
          type="button"
          onClick={() => setMobileCartOpen(true)}
          className="fixed inset-x-3 bottom-20 z-40 flex items-center justify-between rounded-xl bg-green-600 px-4 py-3 text-white shadow-lg active:scale-[0.98] min-[1025px]:hidden"
        >
          <span className="flex items-center gap-2 text-sm font-bold">
            <ShoppingCart className="h-4 w-4" />
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
          <span className="text-sm font-bold">{formatCurrency(cartTotal)}</span>
        </button>
      )}

      {showCart && mobileCartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white min-[1025px]:hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">Current order</h2>
            <button
              type="button"
              onClick={() => setMobileCartOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="scrollbar-hide flex-1 overflow-y-auto">
            <OrderTable
              onPaymentSuccess={handlePaymentSuccess}
              isEditingOrder={isEditingOrder}
              onSaveEdit={handleSaveEdit}
            />
          </div>
        </div>
      )}
    </div>
  );
}
