export type TelegramLoginScope = 'openid' | 'profile' | 'phone' | 'telegram:bot_access' | string;

export interface ConfigureOptions {
  /** Bot Client ID provided by @BotFather (numeric string). */
  clientId: string;
  /** Exact redirect URI registered with @BotFather. Universal/App Link strongly recommended. */
  redirectUri: string;
  /** Requested OIDC scopes. `openid` is required and added implicitly if missing. */
  scopes?: TelegramLoginScope[];
}

export interface SignInResult {
  /**
   * Signed JWT id_token. MUST be verified server-side against Telegram's JWKS
   * (`https://oauth.telegram.org/.well-known/jwks.json`) before establishing a session.
   */
  idToken: string;
}

export type TelegramLoginErrorCode =
  | 'NOT_CONFIGURED'
  | 'CANCELLED'
  | 'NO_AUTHORIZATION_CODE'
  | 'SERVER_ERROR'
  | 'REQUEST_FAILED'
  | 'UNKNOWN';

export class TelegramLoginError extends Error {
  code: TelegramLoginErrorCode;
  nativeMessage?: string;

  constructor(code: TelegramLoginErrorCode, message: string, nativeMessage?: string) {
    super(message);
    this.name = 'TelegramLoginError';
    this.code = code;
    this.nativeMessage = nativeMessage;
  }
}
