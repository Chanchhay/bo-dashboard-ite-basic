import { headers } from "next/headers";
import { redirect } from "next/navigation";

import BusinessProfileForm from "@/components/business/BusinessProfileForm";
import { auth } from "@/lib/auth/auth";

export default async function BusinessProfilePage() {
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
            <p className="max-w-2xl text-[15px] text-[#5c6660] dark:text-[#94a3b8]">
                Manage the personal details of the business owner.
            </p>

            <div className="mt-7">
                <BusinessProfileForm />
            </div>
        </div>
    );
}
