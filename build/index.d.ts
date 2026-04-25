import { ConfigureOptions, SignInResult, TelegramLoginError } from './ExpoTelegramLogin.types';
export { ConfigureOptions, SignInResult, TelegramLoginError };
export type { TelegramLoginErrorCode, TelegramLoginScope } from './ExpoTelegramLogin.types';
/**
 * Configure the Telegram Login SDK. Call once at app startup before invoking `signIn()`.
 * Safe to call multiple times — the latest configuration wins.
 */
export declare function configure(options: ConfigureOptions): void;
/**
 * Trigger the Telegram login flow.
 *
 * Resolves with a signed JWT `idToken` that MUST be verified server-side against
 * Telegram's JWKS before being trusted. Rejects with a `TelegramLoginError` whose
 * `code` is one of: `NOT_CONFIGURED`, `CANCELLED`, `NO_AUTHORIZATION_CODE`,
 * `SERVER_ERROR`, `REQUEST_FAILED`, `UNKNOWN`.
 */
export declare function signIn(): Promise<SignInResult>;
//# sourceMappingURL=index.d.ts.map