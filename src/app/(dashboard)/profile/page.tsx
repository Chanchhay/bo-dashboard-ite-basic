import { headers } from "next/headers";
import { redirect } from "next/navigation";

import UserProfileForm from "@/components/profile/UserProfileForm";
import { auth } from "@/lib/auth/auth";

export default async function UserProfilePage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/login");
    }

    // Navigation, the page title and the account menu come from the app shell,
    // so this page only owns its own content.
    return (
        <div className="pb-4">
            <p className="max-w-2xl text-[15px] text-[#5c6660] dark:text-[#94a3b8]">
                Review your account details and keep your personal information
                up to date.
            </p>

            <div className="mt-7">
                <UserProfileForm />
            </div>
        </div>
    );
}
