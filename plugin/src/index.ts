import {
  AndroidConfig,
  ConfigPlugin,
  withAndroidManifest,
  withEntitlementsPlist,
  withInfoPlist,
  withProjectBuildGradle,
} from 'expo/config-plugins';

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

const DEFAULT_PATH = '/tglogin';

function resolvePlatformHost(
  platform: 'ios' | 'android',
  options: ExpoTelegramLoginPluginOptions,
): string {
  const platformOpts = options[platform];
  if (platformOpts?.redirectHost) {
    return platformOpts.redirectHost;
  }
  if (platformOpts?.appId) {
    return `app${platformOpts.appId}-login.tg.dev`;
  }
  throw new Error(
    `[expo-telegram-login] Plugin requires \`${platform}.appId\` or \`${platform}.redirectHost\`.`,
  );
}

const withTelegramLoginIos: ConfigPlugin<ExpoTelegramLoginPluginOptions> = (config, options) => {
  const host = resolvePlatformHost('ios', options);
  const associatedDomain = `applinks:${host}${options.iosDevelopmentMode ? '?mode=developer' : ''}`;

  config = withEntitlementsPlist(config, (cfg) => {
    const key = 'com.apple.developer.associated-domains';
    const existing: string[] = Array.isArray(cfg.modResults[key])
      ? (cfg.modResults[key] as string[])
      : [];
    if (!existing.includes(associatedDomain)) {
      cfg.modResults[key] = [...existing, associatedDomain];
    }
    return cfg;
  });

  if (options.customScheme) {
    const scheme = options.customScheme;
    config = withInfoPlist(config, (cfg) => {
      const urlTypes: any[] = Array.isArray(cfg.modResults.CFBundleURLTypes)
        ? (cfg.modResults.CFBundleURLTypes as any[])
        : [];
      const alreadyHas = urlTypes.some((entry: any) =>
        Array.isArray(entry?.CFBundleURLSchemes) && entry.CFBundleURLSchemes.includes(scheme),
      );
      if (!alreadyHas) {
        urlTypes.push({
          CFBundleURLName: `expo-telegram-login.${scheme}`,
          CFBundleURLSchemes: [scheme],
        });
        cfg.modResults.CFBundleURLTypes = urlTypes;
      }
      return cfg;
    });
  }

  // Required so the SDK can detect whether the Telegram app is installed via
  // `canOpenURL("tg://...")`. Without this, iOS silently denies the query and
  // the SDK falls back to ASWebAuthenticationSession.
  config = withInfoPlist(config, (cfg) => {
    const queries: string[] = Array.isArray(cfg.modResults.LSApplicationQueriesSchemes)
      ? (cfg.modResults.LSApplicationQueriesSchemes as string[])
      : [];
    if (!queries.includes('tg')) {
      cfg.modResults.LSApplicationQueriesSchemes = [...queries, 'tg'];
    }
    return cfg;
  });

  return config;
};

const TELEGRAM_MAVEN_URL = 'https://maven.pkg.github.com/TelegramMessenger/telegram-login-android';
const TELEGRAM_MAVEN_MARKER = '// expo-telegram-login: GitHub Packages repo';

const TELEGRAM_MAVEN_BLOCK = `    ${TELEGRAM_MAVEN_MARKER}
    maven {
      url = uri("${TELEGRAM_MAVEN_URL}")
      credentials {
        username = project.findProperty("gpr.user") ?: System.getenv("GITHUB_USERNAME")
        password = project.findProperty("gpr.key") ?: System.getenv("GITHUB_TOKEN")
      }
    }`;

const withTelegramLoginGradleRepo: ConfigPlugin = (config) => {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error(
        '[expo-telegram-login] Only Groovy android/build.gradle is supported.',
      );
    }
    const contents = cfg.modResults.contents;
    if (contents.includes(TELEGRAM_MAVEN_MARKER)) {
      return cfg;
    }
    const allprojectsRegex = /(allprojects\s*\{\s*repositories\s*\{)([\s\S]*?)(\n\s*\}\s*\n\s*\})/m;
    const match = contents.match(allprojectsRegex);
    if (!match) {
      throw new Error(
        '[expo-telegram-login] Could not find allprojects.repositories in android/build.gradle.',
      );
    }
    const replacement = `${match[1]}${match[2]}\n${TELEGRAM_MAVEN_BLOCK}${match[3]}`;
    cfg.modResults.contents = contents.replace(allprojectsRegex, replacement);
    return cfg;
  });
};

const withTelegramLoginAndroid: ConfigPlugin<ExpoTelegramLoginPluginOptions> = (config, options) => {
  const host = resolvePlatformHost('android', options);
  const path = options.redirectPath ?? DEFAULT_PATH;

  config = withTelegramLoginGradleRepo(config);

  return withAndroidManifest(config, (cfg) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    const mainActivity = application.activity?.find(
      (a) => a.$['android:name'] === '.MainActivity',
    );
    if (!mainActivity) {
      throw new Error('[expo-telegram-login] Could not locate .MainActivity in AndroidManifest.');
    }

    mainActivity.$['android:launchMode'] = mainActivity.$['android:launchMode'] ?? 'singleTask';
    mainActivity['intent-filter'] = mainActivity['intent-filter'] ?? [];

    const appLinkFilter = {
      $: { 'android:autoVerify': 'true' },
      action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
      category: [
        { $: { 'android:name': 'android.intent.category.DEFAULT' } },
        { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
      ],
      data: [
        { $: { 'android:scheme': 'https', 'android:host': host, 'android:pathPrefix': path } },
      ],
    };

    const alreadyHasAppLink = mainActivity['intent-filter']!.some((f: any) =>
      (f.data ?? []).some(
        (d: any) =>
          d.$?.['android:host'] === host &&
          d.$?.['android:scheme'] === 'https',
      ),
    );
    if (!alreadyHasAppLink) {
      mainActivity['intent-filter']!.push(appLinkFilter as any);
    }

    if (options.customScheme) {
      const schemeFilter = {
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        category: [
          { $: { 'android:name': 'android.intent.category.DEFAULT' } },
          { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
        ],
        data: [{ $: { 'android:scheme': options.customScheme } }],
      };
      const alreadyHasScheme = mainActivity['intent-filter']!.some((f: any) =>
        (f.data ?? []).some((d: any) => d.$?.['android:scheme'] === options.customScheme),
      );
      if (!alreadyHasScheme) {
        mainActivity['intent-filter']!.push(schemeFilter as any);
      }
    }

    return cfg;
  });
};

const withTelegramLogin: ConfigPlugin<ExpoTelegramLoginPluginOptions | void> = (config, options) => {
  const opts = options ?? {};
  config = withTelegramLoginIos(config, opts);
  config = withTelegramLoginAndroid(config, opts);
  return config;
};

export default withTelegramLogin;
