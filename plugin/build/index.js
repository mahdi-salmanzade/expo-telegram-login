"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("expo/config-plugins");
const DEFAULT_PATH = '/tglogin';
function resolvePlatformHost(platform, options) {
    const platformOpts = options[platform];
    if (platformOpts?.redirectHost) {
        return platformOpts.redirectHost;
    }
    if (platformOpts?.appId) {
        return `app${platformOpts.appId}-login.tg.dev`;
    }
    throw new Error(`[expo-telegram-login] Plugin requires \`${platform}.appId\` or \`${platform}.redirectHost\`.`);
}
const withTelegramLoginIos = (config, options) => {
    const host = resolvePlatformHost('ios', options);
    const associatedDomain = `applinks:${host}${options.iosDevelopmentMode ? '?mode=developer' : ''}`;
    config = (0, config_plugins_1.withEntitlementsPlist)(config, (cfg) => {
        const key = 'com.apple.developer.associated-domains';
        const existing = Array.isArray(cfg.modResults[key])
            ? cfg.modResults[key]
            : [];
        if (!existing.includes(associatedDomain)) {
            cfg.modResults[key] = [...existing, associatedDomain];
        }
        return cfg;
    });
    if (options.customScheme) {
        const scheme = options.customScheme;
        config = (0, config_plugins_1.withInfoPlist)(config, (cfg) => {
            const urlTypes = Array.isArray(cfg.modResults.CFBundleURLTypes)
                ? cfg.modResults.CFBundleURLTypes
                : [];
            const alreadyHas = urlTypes.some((entry) => Array.isArray(entry?.CFBundleURLSchemes) && entry.CFBundleURLSchemes.includes(scheme));
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
    config = (0, config_plugins_1.withInfoPlist)(config, (cfg) => {
        const queries = Array.isArray(cfg.modResults.LSApplicationQueriesSchemes)
            ? cfg.modResults.LSApplicationQueriesSchemes
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
const withTelegramLoginGradleRepo = (config) => {
    return (0, config_plugins_1.withProjectBuildGradle)(config, (cfg) => {
        if (cfg.modResults.language !== 'groovy') {
            throw new Error('[expo-telegram-login] Only Groovy android/build.gradle is supported.');
        }
        const contents = cfg.modResults.contents;
        if (contents.includes(TELEGRAM_MAVEN_MARKER)) {
            return cfg;
        }
        const allprojectsRegex = /(allprojects\s*\{\s*repositories\s*\{)([\s\S]*?)(\n\s*\}\s*\n\s*\})/m;
        const match = contents.match(allprojectsRegex);
        if (!match) {
            throw new Error('[expo-telegram-login] Could not find allprojects.repositories in android/build.gradle.');
        }
        const replacement = `${match[1]}${match[2]}\n${TELEGRAM_MAVEN_BLOCK}${match[3]}`;
        cfg.modResults.contents = contents.replace(allprojectsRegex, replacement);
        return cfg;
    });
};
const withTelegramLoginAndroid = (config, options) => {
    const host = resolvePlatformHost('android', options);
    const path = options.redirectPath ?? DEFAULT_PATH;
    config = withTelegramLoginGradleRepo(config);
    return (0, config_plugins_1.withAndroidManifest)(config, (cfg) => {
        const application = config_plugins_1.AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
        const mainActivity = application.activity?.find((a) => a.$['android:name'] === '.MainActivity');
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
        const alreadyHasAppLink = mainActivity['intent-filter'].some((f) => (f.data ?? []).some((d) => d.$?.['android:host'] === host &&
            d.$?.['android:scheme'] === 'https'));
        if (!alreadyHasAppLink) {
            mainActivity['intent-filter'].push(appLinkFilter);
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
            const alreadyHasScheme = mainActivity['intent-filter'].some((f) => (f.data ?? []).some((d) => d.$?.['android:scheme'] === options.customScheme));
            if (!alreadyHasScheme) {
                mainActivity['intent-filter'].push(schemeFilter);
            }
        }
        return cfg;
    });
};
const withTelegramLogin = (config, options) => {
    const opts = options ?? {};
    config = withTelegramLoginIos(config, opts);
    config = withTelegramLoginAndroid(config, opts);
    return config;
};
exports.default = withTelegramLogin;
