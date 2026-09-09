import { redirect } from "next/navigation";

import { POST_LOGIN_URL } from "@/lib/api/no-business";

export default async function CallbackPage() {
    redirect(POST_LOGIN_URL);
}
