import { redirect } from "next/navigation";

export default async function CallbackPage() {
    // Signing in always lands on the launcher.
    redirect("/apps");
}
