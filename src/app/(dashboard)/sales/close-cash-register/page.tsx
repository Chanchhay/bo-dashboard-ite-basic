"use client";

import { CloseRegister } from "@/components/pos/close-register";
import { useCloseRegisterMutation, useGetRegisterSessionQuery } from "@/features/pin/close-cash-register-api";
import { useRouter } from "next/navigation";


export default function CloseRegisterPage() {
  const router = useRouter();
  const { data: session, isLoading } = useGetRegisterSessionQuery();
  const [closeRegister, { isLoading: isClosing }] = useCloseRegisterMutation();

  async function handleConfirm(totalCounted: number) {
    if (!session) return;
    try {
      await closeRegister({
        registerSessionId: session.registerSessionId,
        totalCounted,
      }).unwrap();
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