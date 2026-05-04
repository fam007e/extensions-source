package xyz.nulldev.androidcompat.androidimpl

import android.webkit.CookieManager
import android.webkit.ValueCallback
import android.webkit.WebView

@Suppress("DEPRECATION")
class StubbedCookieManager : CookieManager() {
    override fun setAcceptCookie(accept: Boolean) {
        throw NotImplementedError()
    }

    override fun acceptCookie(): Boolean {
        throw NotImplementedError()
    }

    override fun setAcceptThirdPartyCookies(webview: WebView?, accept: Boolean) {
    }

    override fun acceptThirdPartyCookies(webview: WebView?): Boolean {
        throw NotImplementedError()
    }

    override fun setCookie(url: String, value: String) {
    }

    override fun setCookie(url: String?, value: String?, callback: ValueCallback<Boolean>?) {
    }

    override fun getCookie(url: String?): String {
        throw NotImplementedError()
    }

    @Deprecated("")
    override fun getCookie(url: String?, privateBrowsing: Boolean): String {
        throw NotImplementedError()
    }

    @Deprecated("")
    override fun removeSessionCookie() {
    }

    @Deprecated("")
    override fun removeSessionCookies(callback: ValueCallback<Boolean>?) {
    }

    @Deprecated("")
    override fun removeAllCookie() {
    }

    @Deprecated("")
    override fun removeAllCookies(callback: ValueCallback<Boolean>?) {
    }

    override fun hasCookies(): Boolean {
        throw NotImplementedError()
    }

    @Deprecated("")
    override fun hasCookies(privateBrowsing: Boolean): Boolean {
        throw NotImplementedError()
    }

    @Deprecated("")
    override fun removeExpiredCookie() {
    }

    override fun flush() {
    }

    override fun allowFileSchemeCookiesImpl(): Boolean {
        throw NotImplementedError()
    }

    override fun setAcceptFileSchemeCookiesImpl(accept: Boolean) {
    }
}