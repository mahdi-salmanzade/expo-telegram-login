import { ConfigPlugin } from 'expo/config-plugins';
export interface PlatformOptions {
    /**
     * Per-platform Native App ID assigned by @BotFather when you registered the
     * native app (NOT the bot's Client ID). Embedded in the redirect host
     * `app{appId}-login.tg.dev`. Each native registration (one per platform) gets
     * its own App ID.
     */
    appId?: string;
    /**
     * Override the redirect host outright. Defaults to `app{appId}-login.tg.dev`.
     */
    redirectHost?: string;
}
export interface ExpoTelegramLoginPluginOptions {
    /**
     * Per-platform Native App ID + redirect host overrides.
     */
    ios?: PlatformOptions;
    android?: PlatformOptions;
    /**
     * Path component of the redirect URI. Used by the Android intent-filter
     * `pathPrefix` and (for documentation) the iOS-side runtime URI. iOS
     * Associated Domains do not honor a path. Defaults to `/tglogin`.
     */
    redirectPath?: string;
    /**
     * Optional custom URL scheme registered as fallback when Universal/App Links
     * are unavailable. Example: `pingroom`. Set to `null` to disable.
     */
    customScheme?: string | null;
    /**
     * iOS: append `?mode=developer` to the Associated Domain entry. Useful for
     * debugging Apple's CDN cache during development. Should NOT ship to production.
     */
    iosDevelopmentMode?: boolean;
}
declare const withTelegramLogin: ConfigPlugin<ExpoTelegramLoginPluginOptions | void>;
export default withTelegramLogin;
