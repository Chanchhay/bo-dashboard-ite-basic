"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import BrandLogo from "@/components/brand/BrandLogo";

type LoginState = "redirecting" | "signed-out";

function LoginContent() {
    const searchParams = useSearchParams();
    const wasLoggedOut = searchParams.get("loggedOut") === "1";
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [loginState, setLoginState] = useState<LoginState>(
        wasLoggedOut ? "signed-out" : "redirecting",
    );

    const beginOAuthLogin = useCallback(() => {
        document.cookie = "ipos_welcome=1; path=/; max-age=600; samesite=lax";

        void authClient.signIn
            .oauth2({
                providerId: "keycloak",
                callbackURL: "/apps",
                errorCallbackURL: "/login",
            })
            .then(({ error }) => {
                if (error) {
                    setErrorMessage(error.message ?? "Unable to start login");
                    setLoginState("signed-out");
                }
            });
    }, []);

    useEffect(() => {
        if (!wasLoggedOut) beginOAuthLogin();
    }, [beginOAuthLogin, wasLoggedOut]);

    function startLogin() {
        setErrorMessage(null);
        setLoginState("redirecting");
        beginOAuthLogin();
    }

    const isSignedOut = loginState === "signed-out";

    return (
        <main className="flex min-h-screen items-center justify-center px-6">
            <div className="w-full max-w-sm space-y-4 text-center">
                <BrandLogo
                    variant="stacked"
                    className="mx-auto w-40"
                    preload
                />
                <h1 className="text-xl font-semibold">
                    {isSignedOut ? "You are signed out" : "Redirecting to login"}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {isSignedOut
                        ? "Sign in again when you are ready."
                        : "You are being sent to Login page."}
                </p>
                {errorMessage ? (
                    <p className="text-sm text-destructive">{errorMessage}</p>
                ) : null}
                {isSignedOut ? (
                    <button
                        type="button"
                        onClick={startLogin}
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                        Sign in
                    </button>
                ) : null}
            </div>
        </main>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginContent />
        </Suspense>
    );
}
