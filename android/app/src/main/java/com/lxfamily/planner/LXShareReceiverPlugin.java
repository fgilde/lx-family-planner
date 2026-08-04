package com.lxfamily.planner;

import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.provider.OpenableColumns;

import androidx.core.content.IntentCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "LXShareReceiver")
public class LXShareReceiverPlugin extends Plugin {
    private static final long MAX_SHARE_BYTES = 120L * 1024L * 1024L;
    private static final String PREFS_NAME = "lx_recipe_share";
    private static final String KEY_PATH = "path";
    private static final String KEY_NAME = "name";
    private static final String KEY_TYPE = "type";
    private static final String KEY_SIZE = "size";
    private static final String KEY_ERROR = "error";
    private static final ExecutorService FILE_WORKER =
        Executors.newSingleThreadExecutor();

    static boolean canReceive(Intent intent) {
        return intent != null &&
            Intent.ACTION_SEND.equals(intent.getAction()) &&
            sharedUri(intent) != null;
    }

    static void storeSharedRecipe(
        Context sourceContext,
        Intent intent,
        Runnable onComplete
    ) {
        Context context = sourceContext.getApplicationContext();
        Uri source = sharedUri(intent);
        String mimeType = intent.getType() == null
            ? "application/octet-stream"
            : intent.getType().toLowerCase(Locale.ROOT);
        FILE_WORKER.execute(() -> {
            persistSharedRecipe(context, source, mimeType);
            new Handler(Looper.getMainLooper()).post(onComplete);
        });
    }

    @PluginMethod
    public void getPendingRecipeShare(PluginCall call) {
        SharedPreferences preferences = preferences(getContext());
        String path = preferences.getString(KEY_PATH, "");
        String error = preferences.getString(KEY_ERROR, "");
        File file = path.isEmpty() ? null : new File(path);
        JSObject result = new JSObject();
        result.put("available", file != null && file.isFile());
        result.put("errorCode", error);
        if (file != null && file.isFile()) {
            result.put("uri", Uri.fromFile(file).toString());
            result.put("name", preferences.getString(KEY_NAME, "recipes.rtk"));
            result.put(
                "mimeType",
                preferences.getString(KEY_TYPE, "application/zip")
            );
            result.put("size", preferences.getLong(KEY_SIZE, file.length()));
        }
        call.resolve(result);
    }

    @PluginMethod
    public void clearPendingRecipeShare(PluginCall call) {
        clearStoredRecipe(getContext());
        call.resolve();
    }

    private static void persistSharedRecipe(
        Context context,
        Uri source,
        String mimeType
    ) {
        clearStoredRecipe(context);
        if (source == null) {
            storeError(context, "missing_file");
            return;
        }
        File directory = new File(context.getCacheDir(), "shared-recipes");
        if (!directory.exists() && !directory.mkdirs()) {
            storeError(context, "read_failed");
            return;
        }
        File target = new File(
            directory,
            "recipe-" + UUID.randomUUID() + ".rtk"
        );
        long copied = 0;
        try (
            InputStream input = context.getContentResolver().openInputStream(source);
            FileOutputStream output = new FileOutputStream(target, false)
        ) {
            if (input == null) throw new IllegalStateException("missing stream");
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = input.read(buffer)) != -1) {
                copied += read;
                if (copied > MAX_SHARE_BYTES) {
                    throw new SharedRecipeException("too_large");
                }
                output.write(buffer, 0, read);
            }
            output.flush();
            if (!isZipArchive(target)) {
                throw new SharedRecipeException("invalid_archive");
            }
            preferences(context).edit()
                .putString(KEY_PATH, target.getAbsolutePath())
                .putString(KEY_NAME, displayName(context, source))
                .putString(KEY_TYPE, mimeType)
                .putLong(KEY_SIZE, copied)
                .remove(KEY_ERROR)
                .apply();
        } catch (SharedRecipeException error) {
            //noinspection ResultOfMethodCallIgnored
            target.delete();
            storeError(context, error.code);
        } catch (Exception error) {
            //noinspection ResultOfMethodCallIgnored
            target.delete();
            storeError(context, "read_failed");
        }
    }

    private static Uri sharedUri(Intent intent) {
        if (intent == null) return null;
        Uri stream = IntentCompat.getParcelableExtra(
            intent,
            Intent.EXTRA_STREAM,
            Uri.class
        );
        if (stream != null) return stream;
        ClipData clipData = intent.getClipData();
        if (clipData != null && clipData.getItemCount() > 0) {
            Uri clipUri = clipData.getItemAt(0).getUri();
            if (clipUri != null) return clipUri;
        }
        return intent.getData();
    }

    private static String displayName(Context context, Uri source) {
        String name = "recipes.rtk";
        try (
            Cursor cursor = context.getContentResolver().query(
                source,
                new String[] { OpenableColumns.DISPLAY_NAME },
                null,
                null,
                null
            )
        ) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (index >= 0 && !cursor.isNull(index)) name = cursor.getString(index);
            }
        } catch (Exception ignored) {
            // A friendly fallback name is sufficient for the import screen.
        }
        String cleaned = String.valueOf(name)
            .replaceAll("[\\\\/\\p{Cntrl}]", "_")
            .trim();
        if (cleaned.isEmpty()) return "recipes.rtk";
        return cleaned.substring(0, Math.min(200, cleaned.length()));
    }

    private static boolean isZipArchive(File file) {
        try (FileInputStream input = new FileInputStream(file)) {
            byte[] header = new byte[4];
            if (input.read(header) != header.length) return false;
            return header[0] == 0x50 && header[1] == 0x4b &&
                (
                    (header[2] == 0x03 && header[3] == 0x04) ||
                    (header[2] == 0x05 && header[3] == 0x06) ||
                    (header[2] == 0x07 && header[3] == 0x08)
                );
        } catch (Exception error) {
            return false;
        }
    }

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private static void storeError(Context context, String code) {
        preferences(context).edit()
            .remove(KEY_PATH)
            .remove(KEY_NAME)
            .remove(KEY_TYPE)
            .remove(KEY_SIZE)
            .putString(KEY_ERROR, code)
            .apply();
    }

    private static void clearStoredRecipe(Context context) {
        SharedPreferences preferences = preferences(context);
        File allowedDirectory = new File(context.getCacheDir(), "shared-recipes");
        File[] cachedShares = allowedDirectory.listFiles();
        if (cachedShares != null) {
            for (File cachedShare : cachedShares) {
                if (cachedShare.isFile()) {
                    //noinspection ResultOfMethodCallIgnored
                    cachedShare.delete();
                }
            }
        }
        preferences.edit().clear().apply();
    }

    private static final class SharedRecipeException extends Exception {
        private final String code;

        private SharedRecipeException(String code) {
            super(code);
            this.code = code;
        }
    }
}
