import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { BusinessTelegramBotForm } from "@/components/business/BusinessTelegramBotForm";
import { TourButton } from "@/components/onboarding/TourButton";
import { auth } from "@/lib/auth/auth";

export default async function BusinessTelegramPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/login");
    }

    return (
        <div>
            <div className="flex items-center justify-between gap-4">
                <p className="max-w-2xl text-[15px] text-[#5c6660] dark:text-[#94a3b8]">
                    Configure your Telegram bot to receive orders, send payment alerts, and provide a storefront directly inside Telegram.
                </p>
                <TourButton />
            </div>

            <div className="mt-7">
                <BusinessTelegramBotForm />
            </div>
        </div>
    );
}
