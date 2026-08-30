import { BusinessPaymentsForm } from "@/components/business/BusinessPaymentsForm";
import { TourButton } from "@/components/onboarding/TourButton";

export default function BusinessPaymentsPage() {
    return (
        <div>
            <div className="flex items-center justify-between gap-4">
                <p className="max-w-2xl text-[15px] text-muted-foreground">
                    Configure Bakong KHQR payment merchant credentials and checkout settings.
                </p>
                <TourButton />
            </div>

            <div className="mt-7">
                <BusinessPaymentsForm />
            </div>
        </div>
    );
}
