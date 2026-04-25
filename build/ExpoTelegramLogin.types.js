export class TelegramLoginError extends Error {
    code;
    nativeMessage;
    constructor(code, message, nativeMessage) {
        super(message);
        this.name = 'TelegramLoginError';
        this.code = code;
        this.nativeMessage = nativeMessage;
    }
}
//# sourceMappingURL=ExpoTelegramLogin.types.js.map