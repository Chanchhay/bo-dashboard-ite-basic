import { BusinessFacebookPageForm } from "@/components/business/BusinessFacebookPageForm";

export default async function BusinessFacebookPage() {
    return (
        <div className="flex flex-col gap-6 p-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Facebook Integration
                </h1>
                <p className="text-sm text-muted-foreground">
                    Manage your Facebook Page connection, automated messaging, and shop catalog setup.
                </p>
            </div>

            <BusinessFacebookPageForm />
        </div>
    );
}
