package expo.modules.telegramlogin

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.Serializable

class ConfigureOptions : Record, Serializable {
  @Field
  var clientId: String = ""

  @Field
  var redirectUri: String = ""

  @Field
  var scopes: List<String> = listOf("openid")
}
