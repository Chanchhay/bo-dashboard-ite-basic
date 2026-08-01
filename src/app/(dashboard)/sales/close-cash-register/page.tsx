"use client";

import { CloseRegister } from "@/components/pos/close-register";

import { useRouter } from "next/navigation";


export default function CloseRegisterPage() {
  const router = useRouter();
  const session = { registerSessionId: "1", cashierName: "Mock Cashier", openedAt: new Date().toISOString(), openingAmount: 0, revenue: 0, orderCount: 0 };
  const isLoading = false;
  const isClosing = false;
  const closeRegister = async (args: any) => ({});

  async function handleConfirm(totalCounted: number) {
    if (!session) return;
    try {
      await closeRegister({
        registerSessionId: session.registerSessionId,
        totalCounted,
      });
      router.replace("/sales/pos/pin"); // end of shift → back to PIN login
    } catch (err) {
      console.error("Failed to close register:", err);
    }
  }

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f4f5]">
        <p className="text-sm text-gray-400">Loading register session...</p>
      </div>
    );
  }

  return (
    <CloseRegister
      cashierName={session.cashierName}
      openedAt={session.openedAt}
      openingAmount={session.openingAmount}
      revenue={session.revenue}
      orderCount={session.orderCount}
      onConfirm={handleConfirm}
      isProcessing={isClosing}
    />
  );
}