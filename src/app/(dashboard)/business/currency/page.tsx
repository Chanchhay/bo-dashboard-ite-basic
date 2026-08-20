import { headers } from "next/headers";
import { redirect } from "next/navigation";

import BusinessCurrencyForm from "@/components/business/BusinessCurrencyForm";
import { TourButton } from "@/components/onboarding/TourButton";
import { auth } from "@/lib/auth/auth";

export default async function BusinessCurrencyPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/login");
    }

    // The shell supplies navigation and the page title; the Business section in
    // the sidebar already links Profile and Currency.
    return (
        <div className="pb-4">
            <div className="flex items-center justify-between gap-4">
                <p className="max-w-2xl text-[15px] text-muted-foreground">
                    Configure the currencies your business trades in.
                </p>
                <TourButton />
            </div>

            <div className="mt-7">
                <BusinessCurrencyForm />
            </div>
        </div>
    );
}
