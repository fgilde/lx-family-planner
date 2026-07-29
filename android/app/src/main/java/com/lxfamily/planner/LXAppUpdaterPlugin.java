package com.lxfamily.planner;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "LXAppUpdater")
public class LXAppUpdaterPlugin extends Plugin {
    private static final int CONNECT_TIMEOUT_MS = 15_000;
    private static final int READ_TIMEOUT_MS = 60_000;
    private static final long MAX_APK_BYTES = 250L * 1024L * 1024L;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void getInstalledVersion(PluginCall call) {
        JSObject result = new JSObject();
        try {
            PackageInfo info = getContext()
                .getPackageManager()
                .getPackageInfo(getContext().getPackageName(), 0);
            result.put("versionCode", info.getLongVersionCode());
            result.put("versionName", info.versionName == null ? "" : info.versionName);
            call.resolve(result);
        } catch (PackageManager.NameNotFoundException error) {
            call.reject(
                "Die installierte LX-Version konnte nicht gelesen werden.",
                "VERSION_NOT_FOUND",
                error
            );
        }
    }

    @PluginMethod
    public void installUpdate(PluginCall call) {
        String rawUrl = call.getString("url", "");
        String expectedSha256 = call.getString("sha256", "");
        Uri downloadUri;
        try {
            downloadUri = Uri.parse(rawUrl);
        } catch (Exception error) {
            call.reject("Die Update-Adresse ist ungültig.", "INVALID_UPDATE_URL", error);
            return;
        }
        if (
            downloadUri == null ||
            downloadUri.getScheme() == null ||
            (
                !"https".equalsIgnoreCase(downloadUri.getScheme()) &&
                !"http".equalsIgnoreCase(downloadUri.getScheme())
            )
        ) {
            call.reject(
                "Das Update muss über eine HTTP- oder HTTPS-Adresse geladen werden.",
                "INVALID_UPDATE_URL"
            );
            return;
        }

        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            !getContext().getPackageManager().canRequestPackageInstalls()
        ) {
            Intent settingsIntent = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName())
            );
            settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(settingsIntent);
            JSObject result = new JSObject();
            result.put("status", "permission");
            call.resolve(result);
            return;
        }

        executor.execute(() -> {
            File updateDirectory = new File(getContext().getCacheDir(), "updates");
            File apkFile = new File(updateDirectory, "LX-Family-Planner-update.apk");
            try {
                if (!updateDirectory.exists() && !updateDirectory.mkdirs()) {
                    throw new IllegalStateException(
                        "Der temporäre Update-Ordner konnte nicht angelegt werden."
                    );
                }
                downloadApk(downloadUri.toString(), apkFile);
                if (
                    expectedSha256 != null &&
                    !expectedSha256.trim().isEmpty() &&
                    !expectedSha256.equalsIgnoreCase(sha256(apkFile))
                ) {
                    throw new SecurityException(
                        "Die Prüfsumme des Updates stimmt nicht mit dem Server überein."
                    );
                }
                getActivity().runOnUiThread(() -> openInstaller(call, apkFile));
            } catch (Exception error) {
                if (apkFile.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    apkFile.delete();
                }
                call.reject(
                    safeMessage(error),
                    "UPDATE_DOWNLOAD_FAILED",
                    error
                );
            }
        });
    }

    private void downloadApk(String rawUrl, File target) throws Exception {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(rawUrl).openConnection();
            connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
            connection.setReadTimeout(READ_TIMEOUT_MS);
            connection.setInstanceFollowRedirects(true);
            connection.setRequestProperty("Accept", "application/vnd.android.package-archive");
            connection.setRequestProperty(
                "User-Agent",
                "LX-Family-Android-Updater/" + getContext().getPackageName()
            );
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
                throw new IllegalStateException(
                    "Der Server hat das Update nicht bereitgestellt (HTTP " + status + ")."
                );
            }
            long declaredLength = connection.getContentLengthLong();
            if (declaredLength > MAX_APK_BYTES) {
                throw new IllegalStateException("Die Update-Datei ist unerwartet groß.");
            }
            try (
                InputStream input = connection.getInputStream();
                FileOutputStream output = new FileOutputStream(target, false)
            ) {
                byte[] buffer = new byte[64 * 1024];
                long downloaded = 0;
                int read;
                while ((read = input.read(buffer)) != -1) {
                    downloaded += read;
                    if (downloaded > MAX_APK_BYTES) {
                        throw new IllegalStateException(
                            "Die Update-Datei ist unerwartet groß."
                        );
                    }
                    output.write(buffer, 0, read);
                    JSObject progress = new JSObject();
                    progress.put("downloadedBytes", downloaded);
                    progress.put("totalBytes", Math.max(0, declaredLength));
                    notifyListeners("downloadProgress", progress);
                }
                output.flush();
            }
            if (target.length() < 1024) {
                throw new IllegalStateException(
                    "Die geladene Update-Datei ist unvollständig."
                );
            }
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private void openInstaller(PluginCall call, File apkFile) {
        try {
            Uri contentUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                apkFile
            );
            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(
                contentUri,
                "application/vnd.android.package-archive"
            );
            installIntent.addFlags(
                Intent.FLAG_GRANT_READ_URI_PERMISSION |
                Intent.FLAG_ACTIVITY_NEW_TASK
            );
            getContext().startActivity(installIntent);
            JSObject result = new JSObject();
            result.put("status", "installer");
            call.resolve(result);
        } catch (Exception error) {
            call.reject(
                "Android konnte den Installationsdialog nicht öffnen: " +
                    safeMessage(error),
                "UPDATE_INSTALLER_FAILED",
                error
            );
        }
    }

    private String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (FileInputStream input = new FileInputStream(file)) {
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = input.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
        }
        StringBuilder value = new StringBuilder();
        for (byte item : digest.digest()) {
            value.append(String.format(Locale.ROOT, "%02x", item));
        }
        return value.toString();
    }

    private String safeMessage(Exception error) {
        String message = error.getLocalizedMessage();
        return message == null || message.trim().isEmpty()
            ? error.getClass().getSimpleName()
            : message;
    }

    @Override
    protected void handleOnDestroy() {
        executor.shutdownNow();
        super.handleOnDestroy();
    }
}
