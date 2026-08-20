
export const POS_ROUTES = {
    /** The selling screen — the terminal itself. */
    terminal: "/pos",
    /** Counting the opening float, before the terminal opens. */
    openRegister: "/pos/register",
    /** Counting down at end of shift. */
    closeRegister: "/pos/close",
    /** Screen lock over an already-authenticated session. */
    lock: "/pos/lock",
} as const;

/** Where leaving POS returns you to — Sale Management, inside the dashboard. */
export const SALES_HOME = "/sales";
