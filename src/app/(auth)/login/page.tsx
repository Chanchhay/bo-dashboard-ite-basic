"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/auth-client";

export default function LoginPage() {
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        // Arms the one-shot welcome intro. The launcher reads this cookie
        // server-side and clears it, so the animation plays once per sign-in.
        document.cookie = "ipos_welcome=1; path=/; max-age=600; samesite=lax";

        void authClient.signIn
            .oauth2({
                // Signing in lands on the launcher — that is where the welcome
                // intro lives, and where you pick an app to open.
                providerId: "keycloak",
                callbackURL: "/apps",
                errorCallbackURL: "/login",
            })
            .then(({ error }) => {
                if (error) {
                    setErrorMessage(error.message ?? "Unable to start login");
                }
            });
    }, []);

    return (
        <main className="flex min-h-screen items-center justify-center px-6">
            <div className="w-full max-w-sm space-y-4 text-center">
                <h1 className="text-xl font-semibold">Redirecting to login</h1>
                <p className="text-sm text-muted-foreground">
                    You are being sent to Keycloak.
                </p>
                {errorMessage ? (
                    <p className="text-sm text-destructive">{errorMessage}</p>
                ) : null}
            </div>
        </main>
    );
}
