/**
 * One set of form-control styles for the whole app, taken from the "Business
 * Type" field in the business profile. Import these rather than writing
 * per-feature classes, so a control in Inventory looks identical to one in
 * User management.
 *
 * Ink:      #1a222b   typed value
 * Muted:    #6b7280   placeholders and hints
 * Border:   #e8e8e8   resting, primary on focus
 */
const base =
    "w-full rounded-xl border border-[#e8e8e8] bg-white text-base leading-6 text-[#1a222b] outline-none transition-colors placeholder:text-[#6b7280] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:bg-[#f7f8f7] disabled:text-[#6b7280] aria-invalid:border-accent aria-invalid:ring-2 aria-invalid:ring-accent/15";

export const controlClassName = `h-12 px-4 py-3 ${base}`;

export const textareaClassName = `min-h-24 px-4 py-3 ${base}`;

export const labelClassName = "text-base font-medium text-[#424841]";
export const hintClassName = "text-xs text-[#6b7280]";
export const errorClassName = "text-xs text-accent";

/** Primary and secondary actions, sized to line up with the controls. */
export const primaryButtonClassName =
    "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-base font-medium text-white outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:opacity-60";

export const secondaryButtonClassName =
    "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#e8e8e8] bg-white px-5 text-base text-[#1a222b] outline-none transition-colors hover:bg-[#f7f8f7] focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60";
