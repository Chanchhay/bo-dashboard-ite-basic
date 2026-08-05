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
    "w-full rounded-xl border border-[#e8e8e8] dark:border-[#242937] bg-white dark:bg-[#1e2330] text-base leading-6 text-[#1a222b] dark:text-[#f8fafc] outline-none transition-colors placeholder:text-[#6b7280] dark:placeholder:text-[#94a3b8] focus-visible:border-gray-400 dark:focus-visible:border-gray-600 focus-visible:ring-1 focus-visible:ring-gray-400/20 disabled:cursor-not-allowed disabled:bg-[#f7f8f7] dark:disabled:bg-[#151821] disabled:text-[#6b7280] dark:disabled:text-[#64748b] aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/15";

export const controlClassName = `h-12 px-4 py-3 ${base}`;

export const textareaClassName = `min-h-24 px-4 py-3 ${base}`;

export const labelClassName = "text-base font-medium text-[#424841] dark:text-[#cbd5e1]";
export const hintClassName = "text-xs text-[#6b7280] dark:text-[#94a3b8]";
/* `--accent` is the neutral grey in the shadcn token set, not the red it named
   in the pre-shadcn theme — errors styled with it were invisible on white. */
export const errorClassName = "text-xs text-danger";

/** Primary and secondary actions, sized to line up with the controls. */
export const primaryButtonClassName =
    "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-base font-medium text-white outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:opacity-60 shadow-md shadow-primary/20";

export const secondaryButtonClassName =
    "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#c9cbc6] hover:border-[#9ea29b] dark:border-[#384252] dark:hover:border-[#526078] bg-white dark:bg-[#1e2330] px-5 text-base font-semibold text-[#16181c] dark:text-[#f8fafc] outline-none transition-all hover:bg-[#f4f5f3] dark:hover:bg-[#252a38] shadow-xs dark:shadow-[0_2px_6px_rgba(0,0,0,0.25)] focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-60";
