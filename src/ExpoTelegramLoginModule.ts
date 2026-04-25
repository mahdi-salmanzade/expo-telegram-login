import { requireNativeModule } from 'expo-modules-core';

import type { ConfigureOptions, SignInResult } from './ExpoTelegramLogin.types';

interface ExpoTelegramLoginNativeModule {
  configure(options: ConfigureOptions): void;
  signIn(): Promise<SignInResult>;
}

export default requireNativeModule<ExpoTelegramLoginNativeModule>('ExpoTelegramLogin');
