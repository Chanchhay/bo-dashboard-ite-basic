export const SW_URL =
    process.env.NODE_ENV === "development" ? "/sw.js?mode=dev" : "/sw.js";
