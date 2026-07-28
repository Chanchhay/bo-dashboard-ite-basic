"use client";

import { useEffect, useState } from "react";

const ZOOM_MS = 1900;
const LIFT_AT = 1300;
const UNMOUNT_AT = 2100;

/*
 * Per-keyframe easing: a quick settle in, a slow drift, then an accelerating
 * exit. Only `transform`/`opacity` animate on the veil itself — the blur is a
 * static backdrop-filter that fades with the layer, so nothing repaints the
 * page underneath frame by frame.
 */
const KEYFRAMES = `
@keyframes iposWelcomeIn {
  0%   { opacity: 0; transform: scale(.9);   filter: blur(8px);
         animation-timing-function: cubic-bezier(.16,1,.3,1); }
  26%  { opacity: 1; transform: scale(1);    filter: blur(0px);
         animation-timing-function: cubic-bezier(.4,0,.6,1); }
  62%  { opacity: 1; transform: scale(1.04); filter: blur(0px);
         animation-timing-function: cubic-bezier(.6,0,.9,.5); }
  100% { opacity: 0; transform: scale(2.1);  filter: blur(10px); }
}
.ipos-welcome-text { animation: iposWelcomeIn ${ZOOM_MS}ms both; }
@media (prefers-reduced-motion: reduce) {
  .ipos-welcome-text { animation: none; opacity: 0; }
}
`;

/**
 * Plays once per sign-in. The login page arms a cookie, the dashboard reads it
 * server-side, and this clears the cookie so refreshes stay silent.
 */
export default function WelcomeIntro() {
    const [lifted, setLifted] = useState(false);
    const [mounted, setMounted] = useState(true);

    useEffect(() => {
        document.cookie = "ipos_welcome=; path=/; max-age=0; samesite=lax";

        const lift = setTimeout(() => setLifted(true), LIFT_AT);
        const cleanup = setTimeout(() => setMounted(false), UNMOUNT_AT);
        return () => {
            clearTimeout(lift);
            clearTimeout(cleanup);
        };
    }, []);

    if (!mounted) return null;

    return (
        <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-50 grid place-items-center overflow-hidden transition-opacity duration-[800ms]"
            style={{
                opacity: lifted ? 0 : 1,
                transitionTimingFunction: "cubic-bezier(.22,1,.36,1)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                background: "rgba(247,247,246,.55)",
                willChange: "opacity",
            }}
        >
            <style>{KEYFRAMES}</style>
            <span
                className="ipos-welcome-text select-none font-semibold text-[#16181c]"
                style={{
                    fontSize: "clamp(56px, 12vw, 156px)",
                    lineHeight: 1,
                    willChange: "transform, opacity, filter",
                }}
            >
                Welcome
            </span>
        </div>
    );
}
