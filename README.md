# expo-telegram-login-sdk

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Expo native module for **Sign in with Telegram** on iOS and Android. Hands the user off to the installed Telegram app for a passwordless flow, returns a signed JWT `id_token` your backend verifies against [Telegram's JWKS](https://oauth.telegram.org/.well-known/jwks.json).

This is a thin Expo wrapper around Telegram's official SDKs:

- **Android** — links to [`org.telegram:login-sdk`](https://github.com/TelegramMessenger/telegram-login-android) from GitHub Packages.
- **iOS** — vendors the source from [`telegram-login-ios`](https://github.com/TelegramMessenger/telegram-login-ios) (MIT) because Telegram only ships SwiftPM, and Expo's CocoaPods integration can't expose SwiftPM modules to a Pod target. License preserved at `ios/Vendor/LICENSE-TelegramLogin`.

The package does not implement OIDC, store tokens, or verify signatures — that's your backend's job.

## Versioning

This package mirrors the upstream Telegram SDK version it targets. **`v1.0.0` of this package wraps Telegram Login SDK `1.0.0`** (both iOS and Android). When Telegram cuts a new SDK release, this package follows.

Built and tested against Expo SDK 55 / React Native 0.83 on iOS 16+ and Android 13/16. The iOS source is vendored — when Telegram publishes a CocoaPods spec or XCFramework, the iOS integration will swap to a real dependency without changing the public API.

## Requirements

- Expo SDK 53+ with EAS dev/prod build (Expo Go cannot load native modules).
- iOS 15.0+, Xcode 14.0+.
- Android API 23+ (Android 6.0+).
- A Telegram bot registered with [@BotFather](https://t.me/botfather) under **Bot Settings → Login Widget**.

## Installation

```bash
npm install expo-telegram-login-sdk
# or
yarn add expo-telegram-login-sdk
```

If you need an unreleased commit, you can install directly from GitHub instead:

```bash
npm install github:mahdi-salmanzade/expo-telegram-login#main
```

### Android: GitHub Packages credentials

Telegram publishes the Android SDK on GitHub Packages, which requires a personal access token to download. Every developer who builds the app needs:

1. A GitHub PAT with the `read:packages` scope ([create one](https://github.com/settings/tokens)).
2. Either set `gpr.user` and `gpr.key` in `~/.gradle/gradle.properties`:

   ```properties
   gpr.user=your-github-username
   gpr.key=ghp_your_token_here
   ```

   Or export environment variables before each build:

   ```bash
   export GITHUB_USERNAME=your-github-username
   export GITHUB_TOKEN=ghp_your_token_here
   ```

CI/CD must inject the same credentials via secrets. EAS supports `eas secret:create` for this.

The iOS side has no equivalent step — the SDK is vendored.

## BotFather setup

Two things to know upfront:

- **Bot Client ID** — issued once when you enable Login Widget on the bot. Same on every platform. Passed to `TelegramLogin.configure()` as `clientId`.
- **Native App ID** — issued *per platform* when you register a native app. Embedded in the redirect host `app{appId}-login.tg.dev`. Different on iOS vs Android. Passed to the plugin as `ios.appId` / `android.appId`.

These are different numbers. BotFather sometimes labels both as "app id" or "client id" interchangeably — they aren't. The Bot Client ID identifies your bot; the Native App ID identifies one platform registration.

### Register iOS

In BotFather → `/mybots` → your bot → **Bot Settings → Login Widget → Add iOS Platform**:

- **Bundle ID** — your iOS bundle id (e.g. `com.yourcompany.app`).
- **Apple Team ID** — your 10-character Apple Developer team id.

BotFather replies with an iOS Native App ID and an App URL like `https://app214154937-login.tg.dev`.

### Register Android

In BotFather → **Add Android Platform**:

- **Package name** — your Android `applicationId` (e.g. `com.yourcompany.app`).
- **SHA-256 fingerprint** — debug keystore for dev builds, release/EAS keystore for production. Get it via:

   ```bash
   cd android && ./gradlew :app:signingReport
   ```

   Or `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android | grep SHA256`.

   Register both keystores (debug + release) as separate Android platforms in BotFather if you want sign-in to work in dev *and* production.

BotFather replies with an Android Native App ID and a separate App URL (different number from iOS).

## Plugin configuration

```json
{
  "expo": {
    "plugins": [
      [
        "expo-telegram-login-sdk",
        {
          "ios": { "appId": "214154937" },
          "android": { "appId": "3978549428" },
          "customScheme": "yourapp"
        }
      ]
    ]
  }
}
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `ios.appId` | string | — | iOS Native App ID from BotFather. Used to derive `app{appId}-login.tg.dev`. |
| `ios.redirectHost` | string | derived | Override the iOS Universal Link host. |
| `android.appId` | string | — | Android Native App ID from BotFather. |
| `android.redirectHost` | string | derived | Override the Android App Link host. |
| `redirectPath` | string | `/tglogin` | Path component of the redirect URI. Used by the Android intent-filter. iOS Associated Domains do not honor a path. |
| `customScheme` | string \| null | — | Optional fallback URL scheme registered in BotFather. Set to `null` to disable. |
| `iosDevelopmentMode` | boolean | `false` | Append `?mode=developer` to iOS Associated Domains. Useful for bypassing Apple's CDN cache during dev. **Remove for production.** |

The plugin writes:

- **iOS** — `com.apple.developer.associated-domains` entitlement, `LSApplicationQueriesSchemes` (`tg`) so the SDK can detect the Telegram app, and (optional) a `CFBundleURLTypes` entry for the custom scheme.
- **Android** — `<intent-filter>` on `.MainActivity` for the App Link host with `android:autoVerify="true"`, and (optional) a second filter for the custom scheme. Also injects the GitHub Packages Maven repo into the project-level `build.gradle`.

After editing `app.json`, run `npx expo prebuild --clean` (or rebuild via EAS).

## Usage

```ts
import * as TelegramLogin from 'expo-telegram-login-sdk';
import { Platform } from 'react-native';

const NATIVE_APP_ID = Platform.select({
  ios: '214154937',
  android: '3978549428',
})!;

const REDIRECT_URI = Platform.OS === 'ios'
  ? `https://app${NATIVE_APP_ID}-login.tg.dev`
  : `https://app${NATIVE_APP_ID}-login.tg.dev/tglogin`;

// Call once at app startup.
TelegramLogin.configure({
  clientId: 'YOUR_BOT_CLIENT_ID',
  redirectUri: REDIRECT_URI,
  scopes: ['openid', 'profile'],
});

// Trigger sign-in from a button handler.
async function handleSignIn() {
  try {
    const { idToken } = await TelegramLogin.signIn();
    // POST idToken to your backend; verify against Telegram's JWKS there.
    await api.post('/auth/telegram', { id_token: idToken });
  } catch (e) {
    if (e instanceof TelegramLogin.TelegramLoginError) {
      if (e.code === 'CANCELLED') return; // user backed out
      console.warn(`[telegram-login] ${e.code}: ${e.message}`);
    }
    throw e;
  }
}
```

### Why platform-specific redirect URIs

Telegram's iOS SDK expects the bare host (`https://app{id}-login.tg.dev`); the Android SDK expects the path-prefixed App Link (`https://app{id}-login.tg.dev/tglogin`). Both forms must match what BotFather has on file. The plugin writes the platform-correct manifest entries; the JS-side `redirectUri` you pass to `configure()` must also match the platform.

### Why two configure-time numbers (Client ID vs App ID)

`clientId` is the bot's OIDC client. The redirect host's `app{appId}` segment identifies the *platform registration* and is what BotFather uses to publish the verification files (`assetlinks.json` for Android, `apple-app-site-association` for iOS) at that domain. Different concepts; both are required.

### Available scopes

| Scope | Returns |
| --- | --- |
| `openid` (required) | `sub`, `iss`, `iat`, `exp` |
| `profile` | `name`, `preferred_username`, `picture` |
| `phone` | `phone_number` (prompts user for consent) |
| `telegram:bot_access` | grants your bot DM permission |

Don't request what you don't use — `phone` adds a consent screen.

### Error codes

| `code` | Cause |
| --- | --- |
| `NOT_CONFIGURED` | `signIn()` called before `configure()`. |
| `CANCELLED` | User dismissed the login flow. |
| `NO_AUTHORIZATION_CODE` | Callback URL did not contain a code. |
| `SERVER_ERROR` | Telegram's token endpoint returned non-2xx. |
| `REQUEST_FAILED` | Network or transport failure. |
| `UNKNOWN` | Unmapped native error. |

## Verifying the id_token (server-side)

The `id_token` is a JWT signed by Telegram. Before trusting it:

1. Fetch keys from `https://oauth.telegram.org/.well-known/jwks.json`.
2. Verify the JWT signature against those keys.
3. Confirm `iss === "https://oauth.telegram.org"`, `aud === <your bot client id>`, and `exp` has not passed.

Decoded claims include `sub`, `id`, `name`, `preferred_username`, `picture`, `phone_number` (when the corresponding scope was granted).

See [Telegram's docs](https://core.telegram.org/bots/telegram-login#validating-id-tokens) for the canonical procedure.

## Troubleshooting

### Android: redirect lands in the browser, not the app

Cause: Android Domain Verification didn't succeed for `app{appId}-login.tg.dev`.

```bash
# State should be `verified`, not `1024`.
adb shell pm get-app-links your.package.name
```

Fixes:
1. Confirm the Telegram-hosted `assetlinks.json` is live and contains your SHA-256:
   ```bash
   curl -s https://app${ANDROID_APP_ID}-login.tg.dev/.well-known/assetlinks.json
   ```
2. Force re-verification:
   ```bash
   adb shell pm verify-app-links --re-verify your.package.name
   ```
3. **Some custom Android ROMs** (NothingOS, certain MIUI builds) ship a Domain Verification Agent that doesn't reliably fetch `tg.dev`. Manual approval gets dev unblocked:
   ```bash
   adb shell pm set-app-links --package your.package.name STATE_APPROVED app${ANDROID_APP_ID}-login.tg.dev
   ```
   Production users on stock ROMs (Pixel, Samsung) auto-verify silently and don't hit this.

### iOS: redirect lands in Safari, not the app

Cause: Universal Links not yet verified on this device. Apple's CDN aggressively caches the AASA file.

Fixes:
1. Confirm the AASA is live and lists your bundle id:
   ```bash
   curl -s https://app${IOS_APP_ID}-login.tg.dev/.well-known/apple-app-site-association
   ```
2. Set `iosDevelopmentMode: true` in the plugin config and rebuild. Then on the device, **Settings → Developer → Associated Domains Development → ON**. This bypasses the CDN cache. Disable for production builds.

### iOS: tap login → nothing happens / silent webview fallback

Cause: missing `LSApplicationQueriesSchemes` for `tg`. The plugin sets this automatically on prebuild — if it's missing, you skipped a `prebuild --clean` after adding the plugin.

### Android Gradle: `401 Unauthorized` on `maven.pkg.github.com`

Your `gpr.user` / `gpr.key` aren't reaching Gradle. Check `~/.gradle/gradle.properties` exists and is readable, or that env vars are exported in the same shell that runs the build.

### EAS / CI: build fails because the package is a `file:` dep

Switch to the GitHub URL form so EAS can resolve it:

```json
"expo-telegram-login-sdk": "^1.0.0"
```

## Architecture

Two SDKs, two integration strategies:

**Android** — proper Maven dependency. The plugin injects the GitHub Packages repo (with credential plumbing) into the consumer's project-level `build.gradle`, then the package's `build.gradle` declares `implementation 'org.telegram:login-sdk:1.0.0'`. The Kotlin module wraps `TelegramLogin.init()` / `TelegramLogin.startLogin()` / `TelegramLogin.handleLoginResponse()` and bridges the `OnNewIntent` event back to a pending JS Promise.

**iOS** — vendored source. The Swift Package distributed by Telegram cannot be exposed to a CocoaPods Pod target (CocoaPods has limited SwiftPM support, and Expo's autolinking relies on CocoaPods). The single source file `TelegramLogin.swift` is MIT-licensed and copied to `ios/Vendor/`. The Swift module wraps `TelegramLogin.configure()` / `TelegramLogin.login(completion:)`, and an `ExpoAppDelegateSubscriber` forwards URL opens to `TelegramLogin.handle(url:)`.

Both platforms return the same shape: `{ idToken: string }`.

## Limitations

- Vendored iOS source needs a manual sync when Telegram updates the SDK. We pin to a tag; bumping it is a single-file replacement plus a version bump.
- No tvOS / macOS / web support — only iOS and Android, matching upstream.
- The package doesn't expose Telegram Mini Apps or Bot API helpers — that's outside the auth flow.

## License

MIT. See [LICENSE](LICENSE).

The bundled iOS SDK source is © Telegram Messenger, MIT-licensed; full text in `ios/Vendor/LICENSE-TelegramLogin`. The Android SDK is consumed as a remote dependency under whatever license Telegram has set on [`telegram-login-android`](https://github.com/TelegramMessenger/telegram-login-android).
