package expo.modules.telegramlogin

import android.content.Intent
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.telegram.login.TelegramLogin

class ExpoTelegramLoginModule : Module() {
  private var pendingPromise: Promise? = null
  private var configured: Boolean = false

  override fun definition() = ModuleDefinition {
    Name("ExpoTelegramLogin")

    Function("configure") { options: ConfigureOptions ->
      TelegramLogin.init(
        clientId = options.clientId,
        redirectUri = options.redirectUri,
        scopes = options.scopes,
      )
      configured = true
    }

    AsyncFunction("signIn") { promise: Promise ->
      if (!configured) {
        promise.reject(CodedException("NOT_CONFIGURED", "Call configure() before signIn().", null))
        return@AsyncFunction
      }

      val activity = appContext.currentActivity
        ?: return@AsyncFunction promise.reject(
          CodedException("REQUEST_FAILED", "No current Activity available.", null)
        )

      pendingPromise?.let {
        it.reject(CodedException("CANCELLED", "Superseded by another signIn() call.", null))
      }
      pendingPromise = promise

      try {
        TelegramLogin.startLogin(activity)
      } catch (e: Throwable) {
        pendingPromise = null
        promise.reject(CodedException("REQUEST_FAILED", e.message ?: "Failed to start login.", e))
      }
    }

    OnNewIntent { intent ->
      handleIntent(intent)
    }
  }

  private fun handleIntent(intent: Intent) {
    val uri = intent.data ?: return
    val promise = pendingPromise ?: return

    TelegramLogin.handleLoginResponse(
      uri,
      onSuccess = { loginData ->
        pendingPromise = null
        promise.resolve(mapOf("idToken" to loginData.idToken))
      },
      onError = { error ->
        pendingPromise = null
        val message = errorMessage(error)
        val code = mapErrorCode(message)
        promise.reject(CodedException(code, message, null))
      },
    )
  }

  private fun errorMessage(error: Any?): String {
    if (error == null) {
      return "Unknown Telegram login error"
    }
    return try {
      val messageProp = error.javaClass.getMethod("getMessage").invoke(error) as? String
      messageProp ?: error.toString()
    } catch (_: Throwable) {
      error.toString()
    }
  }

  private fun mapErrorCode(message: String): String {
    val lower = message.lowercase()
    return when {
      lower.contains("cancel") -> "CANCELLED"
      lower.contains("not configured") -> "NOT_CONFIGURED"
      lower.contains("authorization code") -> "NO_AUTHORIZATION_CODE"
      lower.contains("server") || lower.contains("status") -> "SERVER_ERROR"
      lower.contains("request") -> "REQUEST_FAILED"
      else -> "UNKNOWN"
    }
  }
}
