
const MUTE_KEY = "pos.sound.muted";

let muted = false;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
    try {
        muted = window.localStorage.getItem(MUTE_KEY) === "1";
    } catch {
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
    }

    for (const listener of listeners) listener();
}

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

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.02);
}

export function playScanAccepted() {
    tone(2100, 90);
}

export function playScanRejected() {
    tone(220, 130);
    tone(180, 160, 160);
}

export function playTick() {
    tone(1200, 35, 0, 0.02, "sine");
}

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

        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.volume = 0.9;

        window.setTimeout(() => synth.speak(utterance), 520);
    } catch {
    }
}
