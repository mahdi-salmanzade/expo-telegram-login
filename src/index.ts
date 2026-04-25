import ExpoTelegramLoginModule from './ExpoTelegramLoginModule';
import { ConfigureOptions, SignInResult, TelegramLoginError } from './ExpoTelegramLogin.types';

export { ConfigureOptions, SignInResult, TelegramLoginError };
export type { TelegramLoginErrorCode, TelegramLoginScope } from './ExpoTelegramLogin.types';

let configured = false;

/**
 * Configure the Telegram Login SDK. Call once at app startup before invoking `signIn()`.
 * Safe to call multiple times — the latest configuration wins.
 */
export function configure(options: ConfigureOptions): void {
  if (!options.clientId) {
    throw new TelegramLoginError('NOT_CONFIGURED', 'configure() requires a clientId.');
  }
  if (!options.redirectUri) {
    throw new TelegramLoginError('NOT_CONFIGURED', 'configure() requires a redirectUri.');
  }

  const scopes = options.scopes && options.scopes.length > 0 ? options.scopes : ['openid'];
  if (!scopes.includes('openid')) {
    scopes.unshift('openid');
  }

  ExpoTelegramLoginModule.configure({
    clientId: options.clientId,
    redirectUri: options.redirectUri,
    scopes,
  });
  configured = true;
}

/**
 * Trigger the Telegram login flow.
 *
 * Resolves with a signed JWT `idToken` that MUST be verified server-side against
 * Telegram's JWKS before being trusted. Rejects with a `TelegramLoginError` whose
 * `code` is one of: `NOT_CONFIGURED`, `CANCELLED`, `NO_AUTHORIZATION_CODE`,
 * `SERVER_ERROR`, `REQUEST_FAILED`, `UNKNOWN`.
 */
export async function signIn(): Promise<SignInResult> {
  if (!configured) {
    throw new TelegramLoginError(
      'NOT_CONFIGURED',
      'Call configure() before signIn().',
    );
  }

  try {
    return await ExpoTelegramLoginModule.signIn();
  } catch (e: any) {
    const code = (e?.code ?? 'UNKNOWN') as
      | 'NOT_CONFIGURED'
      | 'CANCELLED'
      | 'NO_AUTHORIZATION_CODE'
      | 'SERVER_ERROR'
      | 'REQUEST_FAILED'
      | 'UNKNOWN';
    throw new TelegramLoginError(code, e?.message ?? 'Telegram sign-in failed.', e?.nativeStackAndroid ?? e?.stack);
  }
}
