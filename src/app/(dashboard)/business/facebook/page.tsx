import { BusinessFacebookPageForm } from "@/components/business/BusinessFacebookPageForm";
import { TourButton } from "@/components/onboarding/TourButton";

export default async function BusinessFacebookPage() {
    return (
        <div className="pb-4">
            <div className="flex items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Facebook Integration
                    </h1>
                    <p className="text-[15px] text-muted-foreground">
                        Manage your Facebook Page connection, automated messaging, and shop catalog setup.
                    </p>
                </div>
                <TourButton />
            </div>

            <BusinessFacebookPageForm />
        </div>
    );
}
