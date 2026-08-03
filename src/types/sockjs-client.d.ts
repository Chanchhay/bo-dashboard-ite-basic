declare module "sockjs-client" {
    class SockJS extends WebSocket {
        constructor(url: string, _reserved?: unknown, options?: unknown);
    }
    export = SockJS;
}
