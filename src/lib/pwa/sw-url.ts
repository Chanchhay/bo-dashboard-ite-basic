/**
 * The service worker script to register.
 *
 * A worker cannot read `NODE_ENV`, and it cannot tell a `next dev` server from
 * a production build — both are `localhost` in local testing. The build mode
 * is carried in the script URL instead, so `npm run build && npm start` gets a
 * fully active worker on localhost and `next dev` does not.
 *
 * Registering a different script URL replaces the registration on this scope,
 * so switching between the two locally is just a reload.
 */
export const SW_URL =
    process.env.NODE_ENV === "development" ? "/sw.js?mode=dev" : "/sw.js";
