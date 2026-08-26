import { headers } from "next/headers";
import { redirect } from "next/navigation";

import UserProfileForm from "@/components/profile/UserProfileForm";
import { auth } from "@/lib/auth/auth";

export default async function UserProfilePage() {
    redirect("/settings");
}
