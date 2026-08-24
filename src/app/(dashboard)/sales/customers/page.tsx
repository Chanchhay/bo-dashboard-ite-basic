import CustomerManagement from "@/components/sale/CustomerManagement";
import { TourButton } from "@/components/onboarding/TourButton";

export default function CustomersPage() {
    return (
        <div className="pb-4">
            <div className="flex items-center justify-between gap-4 mb-5">
                <p className="max-w-2xl text-[15px] text-[#5c6660] dark:text-[#94a3b8]">
                    Manage customer profiles, phone numbers, lifetime spending, and loyalty visit records.
                </p>
                <TourButton />
            </div>

            <CustomerManagement />
        </div>
    );
}
