package com.lxfamily.planner;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Keeps the selected self-hosted LX server outside WebView storage.
 *
 * WebView local storage is convenient for the web app but may be cleared by
 * Android WebView repairs or browser-data migration. SharedPreferences belongs
 * to the installed app and is retained by normal signed APK updates.
 */
@CapacitorPlugin(name = "LXServerPreferences")
public class LXServerPreferencesPlugin extends Plugin {
    private static final String PREFS_NAME = "lx_server_preferences";
    private static final String KEY_SERVER_URL = "server_url";
    private static final int MAX_SERVER_URL_LENGTH = 2048;

    @PluginMethod
    public void getServerUrl(PluginCall call) {
        JSObject result = new JSObject();
        result.put(
            "url",
            preferences(getContext()).getString(KEY_SERVER_URL, "")
        );
        call.resolve(result);
    }

    @PluginMethod
    public void setServerUrl(PluginCall call) {
        String url = call.getString("url", "").trim();
        if (url.length() > MAX_SERVER_URL_LENGTH) {
            call.reject("Die Server-Adresse ist zu lang.", "SERVER_URL_TOO_LONG");
            return;
        }
        preferences(getContext()).edit()
            .putString(KEY_SERVER_URL, url)
            .apply();
        call.resolve();
    }

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }
}
