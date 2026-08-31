"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import BrandLogo from "@/components/brand/BrandLogo";
import {
    BLOCKED_PARAM,
    POST_LOGIN_URL,
    blockedReason,
} from "@/lib/api/no-business";

type LoginState = "redirecting" | "signed-out" | "no-business" | "unavailable";

const buttonClass =
    "inline-flex h-10 w-full items-center justify-center rounded-lg px-5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

function LoginContent() {
    const searchParams = useSearchParams();
    const wasLoggedOut = searchParams.get("loggedOut") === "1";
    /*
     * Sent here by the guard when it refused the account. `no-business` is a
     * valid sign-in with nothing for this app to show, which is exactly where
     * a platform administrator's account lands; `unavailable` means the check
     * itself failed and the app will not guess. Either way the session is left
     * intact, so this screen has to explain itself rather than start OAuth
     * over: the live Keycloak session would sign the same account back in.
     */
    const blocked = blockedReason(searchParams.get(BLOCKED_PARAM));
    const signOutForm = useRef<HTMLFormElement>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [loginState, setLoginState] = useState<LoginState>(() => {
        if (blocked === "no-business") return "no-business";
        if (blocked === "unavailable") return "unavailable";
        return wasLoggedOut ? "signed-out" : "redirecting";
    });

    const beginOAuthLogin = useCallback(() => {
        document.cookie = "ipos_welcome=1; path=/; max-age=600; samesite=lax";

        void authClient.signIn
            .oauth2({
                providerId: "keycloak",
                callbackURL: POST_LOGIN_URL,
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
        if (!wasLoggedOut && !blocked) beginOAuthLogin();
    }, [beginOAuthLogin, blocked, wasLoggedOut]);

    function startLogin() {
        setErrorMessage(null);
        setLoginState("redirecting");
        beginOAuthLogin();
    }

    const isSignedOut = loginState === "signed-out";
    const isNoBusiness = loginState === "no-business";
    const isUnavailable = loginState === "unavailable";
    // Both refusals offer the same two ways out.
    const isBlocked = isNoBusiness || isUnavailable;

    const heading = isNoBusiness
        ? "No business on this account"
        : isUnavailable
          ? "We could not check this account"
          : isSignedOut
            ? "You are signed out"
            : "Redirecting to login";

    const description = isNoBusiness
        ? "You are signed in, but this account is not linked to a business, so there is nothing for it to open here."
        : isUnavailable
          ? "You are signed in, but we could not confirm which business this account belongs to, so we have not opened it. Please try again in a moment."
          : isSignedOut
            ? "Sign in again when you are ready."
            : "You are being sent to Login page.";

    return (
        <main className="flex min-h-screen items-center justify-center px-6">
            <div className="w-full max-w-sm space-y-4 text-center">
                <BrandLogo
                    variant="stacked"
                    className="mx-auto w-40"
                    preload
                />
                <h1 className="text-xl font-semibold">{heading}</h1>
                <p className="text-sm text-muted-foreground">{description}</p>
                {errorMessage ? (
                    <p className="text-sm text-destructive">{errorMessage}</p>
                ) : null}
                {isSignedOut ? (
                    <button
                        type="button"
                        onClick={startLogin}
                        className={`${buttonClass} bg-primary text-white hover:bg-primary/90`}
                    >
                        Sign in
                    </button>
                ) : null}
                {isBlocked ? (
                    <div className="space-y-2">
                        {/*
                         * "Try again" is a plain sign-in: the Keycloak session
                         * is still open, so it comes back through the gate
                         * silently and lets in an account that has since been
                         * given a business.
                         */}
                        <button
                            type="button"
                            onClick={startLogin}
                            className={`${buttonClass} bg-primary text-white hover:bg-primary/90`}
                        >
                            Try again
                        </button>
                        <button
                            type="button"
                            onClick={() => signOutForm.current?.requestSubmit()}
                            className={`${buttonClass} border border-border text-foreground hover:bg-accent`}
                        >
                            Use a different account
                        </button>
                        <form
                            ref={signOutForm}
                            action="/api/logout"
                            method="post"
                            hidden
                        />
                    </div>
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
