import type { ConfigureOptions, SignInResult } from './ExpoTelegramLogin.types';
interface ExpoTelegramLoginNativeModule {
    configure(options: ConfigureOptions): void;
    signIn(): Promise<SignInResult>;
}
declare const _default: ExpoTelegramLoginNativeModule;
export default _default;
//# sourceMappingURL=ExpoTelegramLoginModule.d.ts.map