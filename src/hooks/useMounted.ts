"use client";

import { useSyncExternalStore } from "react";

/** Never fires: the value is constant per environment, so nothing changes. */
const subscribe = () => () => {};

/**
 * Whether the component is running in the browser rather than being rendered
 * on the server.
 *
 * For controls whose appearance depends on something only the client has —
 * a fetch result, a browser API. React hydrates by re-running the first render
 * and comparing it against the server's HTML, so a button whose `disabled`
 * waits on a query renders one way on the server and another here, and the
 * tree is reported as mismatched.
 *
 * `useSyncExternalStore` is React's own answer to that split: it is given a
 * separate snapshot for the server, so the first client render is guaranteed
 * to agree with the HTML and the truth arrives on the render after. An effect
 * setting state would do the same thing less directly, which is why the lint
 * rule objects to it.
 */
export function useMounted() {
    return useSyncExternalStore(
        subscribe,
        () => true,
        () => false,
    );
}
