/**
 * Helper to play web audio synthesized chime alerts when real-time notifications arrive.
 * Uses Web Audio API so no external mp3 assets are required and works reliably across browsers.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!audioCtx) {
        const AudioContextClass =
            window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {
            // Browsers may restrict audio until user interaction
        });
    }
    return audioCtx;
}

export function playNotificationSound(type?: string): void {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const t = (type || "").toUpperCase();

        if (t === "ORDER" || t === "PAYMENT" || t === "SUCCESS" || t === "PROMOTION") {
            // High double chime (D5 -> A5)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = "sine";
            osc1.frequency.setValueAtTime(587.33, now); // D5
            osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

            gain1.gain.setValueAtTime(0.25, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            osc1.connect(gain1);
            gain1.connect(ctx.destination);

            osc1.start(now);
            osc1.stop(now + 0.35);
        } else if (t === "INVENTORY" || t === "LOW_STOCK" || t === "WARNING" || t === "ALERT") {
            // Warning double tone (A4 -> F4)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = "triangle";
            osc1.frequency.setValueAtTime(440, now); // A4
            osc1.frequency.setValueAtTime(349.23, now + 0.12); // F4

            gain1.gain.setValueAtTime(0.3, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

            osc1.connect(gain1);
            gain1.connect(ctx.destination);

            osc1.start(now);
            osc1.stop(now + 0.4);
        } else if (t === "SYSTEM" || t === "ERROR" || t === "DANGER") {
            // Low alert tone
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = "sawtooth";
            osc1.frequency.setValueAtTime(300, now);
            osc1.frequency.exponentialRampToValueAtTime(220, now + 0.25);

            gain1.gain.setValueAtTime(0.2, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

            osc1.connect(gain1);
            gain1.connect(ctx.destination);

            osc1.start(now);
            osc1.stop(now + 0.3);
        } else {
            // Default soft chime
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = "sine";
            osc1.frequency.setValueAtTime(523.25, now); // C5

            gain1.gain.setValueAtTime(0.2, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

            osc1.connect(gain1);
            gain1.connect(ctx.destination);

            osc1.start(now);
            osc1.stop(now + 0.25);
        }
    } catch {
        // Ignore audio play errors if blocked by browser policy
    }
}
