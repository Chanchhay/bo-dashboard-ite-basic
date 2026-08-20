import { CashRegister } from "@/components/pos/cash-register";
import { TourButton } from "@/components/onboarding/TourButton";

export default function CashRegisterPage() {
    return (
        <div data-tour="cash-register-shift" className="pb-4">
            <div className="flex items-center justify-between gap-4 mb-5">
                <p className="max-w-2xl text-[15px] text-[#5c6660] dark:text-[#94a3b8]">
                    Open shift float balance, count drawer cash, and close register with end-of-day X/Z reports.
                </p>
                <TourButton />
            </div>

            <CashRegister />
        </div>
    );
}