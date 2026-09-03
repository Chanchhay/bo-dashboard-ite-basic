/*
 * The noises a till makes: the beep that says the item went on, and the
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

const MUTE_KEY = "pos.sound.muted";

let muted = false;
const listeners = new Set<() => void>();

/*
 * Muting is per device, not per account: it is a property of where the till
 * stands — a quiet counter, a noisy market — not of who is standing at it.
 */
if (typeof window !== "undefined") {
    try {
        muted = window.localStorage.getItem(MUTE_KEY) === "1";
    } catch {
        // Private browsing and blocked storage both land here. Defaulting to
        // audible is the safer miss: a cashier can silence it again.
    }
}

export function isMuted() {
    return muted;
}

export function setMuted(next: boolean) {
    muted = next;

    try {
        window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    } catch {
        // The preference simply does not survive a reload.
    }

    for (const listener of listeners) listener();
}

/** For `useSyncExternalStore`, so the toggle never mirrors this into state. */
export function subscribeMuted(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

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

function tone(
    frequency: number,
    durationMs: number,
    startDelayMs = 0,
    peak = 0.06,
    type: OscillatorType = "square",
) {
    if (muted) {
        return;
    }

    const ctx = audioContext();

    if (!ctx) {
        return;
    }

    const startAt = ctx.currentTime + startDelayMs / 1000;
    const endAt = startAt + durationMs / 1000;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);

    // Ramped rather than switched: a square wave cut dead pops in the speaker.
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.01);
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

/**
 * The press of a key, not an announcement.
 *
 * Deliberately quieter and shorter than a scan: this fires on every meaningful
 * tap, so anything louder becomes fatiguing within a shift. A sine avoids the
 * hard edge of the square wave used for scans.
 */
export function playTick() {
    tone(1200, 35, 0, 0.02, "sine");
}

/**
 * The end of a sale: an ascending chime, then the till thanks the customer.
 *
 * Speech is a bonus rather than the message — the chime alone already says the
 * payment landed, so a device with no voices available loses nothing that
 * matters.
 */
export function playPaid() {
    tone(523.25, 120, 0, 0.05, "sine");
    tone(659.25, 120, 110, 0.05, "sine");
    tone(783.99, 240, 220, 0.05, "sine");

    speak("Thank you");
}

function speak(text: string) {
    if (muted || typeof window === "undefined") {
        return;
    }

    try {
        const synth = window.speechSynthesis;

        if (!synth) return;

        // Anything still being said belongs to the previous sale.
        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.volume = 0.9;

        // After the chime, so the two do not talk over each other.
        window.setTimeout(() => synth.speak(utterance), 520);
    } catch {
        // No voices, or speech refused. The chime already did the work.
    }
}
