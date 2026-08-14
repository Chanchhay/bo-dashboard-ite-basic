/*
 * The two noises a till makes: the beep that says the item went on, and the
 * lower buzz that says it did not. Cashiers work by ear — they are looking at
 * the customer, not at the screen — so the sound is the primary confirmation
 * and the toast is the explanation for when the ear is not enough.
 *
 * Synthesised rather than shipped as files: two tones need no assets, no
 * loading state, and no decision about what happens when the file 404s.
 *
 * Browsers refuse audio until the page has been interacted with. That is fine
 * here — the cashier has opened a register and tapped their way to this screen
 * long before the first scan. If a context still cannot start, the sound is
 * skipped silently; it is confirmation, never the mechanism.
 */

let context: AudioContext | null = null;

function audioContext() {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        context ??= new AudioContext();

        if (context.state === "suspended") {
            void context.resume();
        }

        return context;
    } catch {
        return null;
    }
}

function tone(frequency: number, durationMs: number, startDelayMs = 0) {
    const ctx = audioContext();

    if (!ctx) {
        return;
    }

    const startAt = ctx.currentTime + startDelayMs / 1000;
    const endAt = startAt + durationMs / 1000;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(frequency, startAt);

    // Ramped rather than switched: a square wave cut dead pops in the speaker.
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(0.06, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.02);
}

/** One short high beep — the supermarket sound. */
export function playScanAccepted() {
    tone(2100, 90);
}

/** Two low buzzes, which no shop floor mistakes for a good scan. */
export function playScanRejected() {
    tone(220, 130);
    tone(180, 160, 160);
}
