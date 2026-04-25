import ExpoModulesCore
import UIKit

public class ExpoTelegramLoginModule: Module {
  private var isConfigured = false

  public func definition() -> ModuleDefinition {
    Name("ExpoTelegramLogin")

    Function("configure") { (options: ConfigureOptionsRecord) in
      self.isConfigured = true
      let clientId = options.clientId
      let redirectUri = options.redirectUri
      let scopes = options.scopes
      Task { @MainActor in
        TelegramLogin.configure(
          clientId: clientId,
          redirectUri: redirectUri,
          scopes: scopes
        )
      }
    }

    AsyncFunction("signIn") { (promise: Promise) in
      guard self.isConfigured else {
        promise.reject("NOT_CONFIGURED", "Call configure() before signIn().")
        return
      }

      Task { @MainActor in
        TelegramLogin.login { result in
          switch result {
          case .success(let loginData):
            promise.resolve([
              "idToken": loginData.idToken
            ])
          case .failure(let error):
            let (code, message) = ExpoTelegramLoginErrorMapper.map(error)
            promise.reject(code, message)
          }
        }
      }
    }
  }
}

private struct ConfigureOptionsRecord: Record {
  @Field var clientId: String = ""
  @Field var redirectUri: String = ""
  @Field var scopes: [String] = ["openid"]
}

internal enum ExpoTelegramLoginErrorMapper {
  static func map(_ error: Error) -> (String, String) {
    let message = error.localizedDescription
    let lower = message.lowercased()

    if lower.contains("cancel") {
      return ("CANCELLED", message)
    }
    if lower.contains("not configured") {
      return ("NOT_CONFIGURED", message)
    }
    if lower.contains("authorization code") {
      return ("NO_AUTHORIZATION_CODE", message)
    }
    if lower.contains("server") || lower.contains("status") {
      return ("SERVER_ERROR", message)
    }
    if lower.contains("request") {
      return ("REQUEST_FAILED", message)
    }
    return ("UNKNOWN", message)
  }
}
