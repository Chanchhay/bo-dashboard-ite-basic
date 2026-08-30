import { redirect } from "next/navigation";

import { POST_LOGIN_URL } from "@/lib/api/no-business";

export default async function CallbackPage() {
    // Through the gate rather than straight to /apps: an account with no
    // business must not reach the dashboard at all.
    redirect(POST_LOGIN_URL);
}
