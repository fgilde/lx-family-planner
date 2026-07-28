package com.lxfamily.planner;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        String userAgent = getBridge().getWebView().getSettings().getUserAgentString();
        if (!userAgent.contains("LXFamilyAndroid/")) {
            getBridge().getWebView().getSettings().setUserAgentString(
                userAgent + " LXFamilyAndroid/" + installedVersionCode()
            );
        }
        openSharedRecipe(getIntent());
    }

    private long installedVersionCode() {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(
                getPackageName(),
                0
            );
            return info.getLongVersionCode();
        } catch (PackageManager.NameNotFoundException error) {
            return 0;
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        openSharedRecipe(intent);
    }

    private void openSharedRecipe(Intent intent) {
        if (
            intent == null ||
            !Intent.ACTION_SEND.equals(intent.getAction()) ||
            !"text/plain".equals(intent.getType())
        ) {
            return;
        }
        String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        String title = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        if (
            (text == null || text.trim().isEmpty()) &&
            (title == null || title.trim().isEmpty())
        ) {
            return;
        }
        String currentUrl = getBridge().getWebView().getUrl();
        Uri current = Uri.parse(
            currentUrl == null || currentUrl.trim().isEmpty()
                ? "http://localhost"
                : currentUrl
        );
        Uri target = current.buildUpon()
            .path("/share-recipe")
            .clearQuery()
            .fragment(null)
            .appendQueryParameter("text", text == null ? "" : text)
            .appendQueryParameter("title", title == null ? "" : title)
            .build();
        getBridge().getWebView().post(
            () -> getBridge().getWebView().loadUrl(target.toString())
        );
    }
}
