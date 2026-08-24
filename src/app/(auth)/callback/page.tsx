import { redirect } from "next/navigation";

export default async function CallbackPage() {
    redirect("/apps");
}
