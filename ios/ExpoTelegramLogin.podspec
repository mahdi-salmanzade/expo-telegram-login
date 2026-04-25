require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ExpoTelegramLogin'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['homepage']
  s.platforms      = {
    :ios => '15.0',
    :tvos => '15.0'
  }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/mahdi-salmanzade/expo-telegram-login' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  # Vendor Telegram's iOS Login SDK source files (MIT-licensed) directly.
  # Reason: Telegram only distributes via SwiftPM, and CocoaPods cannot expose
  # SwiftPM modules to Pod targets, so a Pod that wants to call into
  # `TelegramLogin` must compile the source itself. License preserved at
  # ios/Vendor/LICENSE-TelegramLogin.
  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
