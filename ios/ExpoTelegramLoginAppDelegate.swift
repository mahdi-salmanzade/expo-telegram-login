import ExpoModulesCore
import UIKit

/// Forwards incoming URL opens (custom scheme + Universal Links) to the
/// Telegram Login SDK so it can complete a pending sign-in flow.
///
/// Registered automatically via expo-module.config.json `ios.appDelegateSubscribers`.
public class ExpoTelegramLoginAppDelegate: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    Task { @MainActor in TelegramLogin.handle(url) }
    return false
  }

  public func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
       let url = userActivity.webpageURL {
      Task { @MainActor in TelegramLogin.handle(url) }
    }
    return false
  }
}
