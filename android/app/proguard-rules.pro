# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# BASIRA enables Google native auth only. @capacitor-firebase/authentication
# ships Facebook handler bytecode even when its optional Android Facebook SDK
# dependency is not enabled (rgcfaIncludeFacebook is intentionally absent).
# R8 must therefore ignore those unreachable optional SDK references rather
# than forcing the full Facebook SDK into a Google-only release build.
-dontwarn com.facebook.**

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile
