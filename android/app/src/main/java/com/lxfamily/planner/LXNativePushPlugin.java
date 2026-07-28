package com.lxfamily.planner;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;

@CapacitorPlugin(name = "LXNativePush")
public class LXNativePushPlugin extends Plugin {

    @PluginMethod
    public void diagnose(PluginCall call) {
        JSObject result = new JSObject();
        int playServicesStatus = GoogleApiAvailability
            .getInstance()
            .isGooglePlayServicesAvailable(getContext());
        result.put("playServicesStatus", playServicesStatus);
        result.put(
            "playServicesMessage",
            GoogleApiAvailability.getInstance().getErrorString(playServicesStatus)
        );
        result.put(
            "playServicesAvailable",
            playServicesStatus == ConnectionResult.SUCCESS
        );
        result.put("packageName", getContext().getPackageName());

        try {
            FirebaseApp firebaseApp = FirebaseApp.getInstance();
            result.put("firebaseConfigured", true);
            result.put("projectId", firebaseApp.getOptions().getProjectId());
            result.put("applicationId", firebaseApp.getOptions().getApplicationId());
        } catch (IllegalStateException error) {
            result.put("firebaseConfigured", false);
            result.put("firebaseError", safeMessage(error));
        }
        call.resolve(result);
    }

    @PluginMethod
    public void getToken(PluginCall call) {
        int playServicesStatus = GoogleApiAvailability
            .getInstance()
            .isGooglePlayServicesAvailable(getContext());
        if (playServicesStatus != ConnectionResult.SUCCESS) {
            String status = GoogleApiAvailability
                .getInstance()
                .getErrorString(playServicesStatus);
            call.reject(
                "Google Play-Dienste sind nicht bereit: " + status + ".",
                "PLAY_SERVICES_" + playServicesStatus
            );
            return;
        }

        try {
            FirebaseApp.getInstance();
        } catch (IllegalStateException error) {
            call.reject(
                "Firebase wurde in der Android-App nicht initialisiert.",
                "FIREBASE_NOT_INITIALIZED",
                error
            );
            return;
        }

        FirebaseMessaging.getInstance().setAutoInitEnabled(true);
        FirebaseMessaging
            .getInstance()
            .getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Exception error = task.getException();
                    call.reject(
                        "Firebase konnte keinen Geräteschlüssel erstellen: " +
                        safeMessage(error),
                        "FCM_TOKEN_FAILED",
                        error
                    );
                    return;
                }
                String token = task.getResult();
                if (token == null || token.trim().isEmpty()) {
                    call.reject(
                        "Firebase hat einen leeren Geräteschlüssel geliefert.",
                        "FCM_TOKEN_EMPTY"
                    );
                    return;
                }
                JSObject result = new JSObject();
                result.put("value", token);
                call.resolve(result);
            });
    }

    private String safeMessage(Exception error) {
        if (error == null) return "Unbekannter Android-Fehler";
        String message = error.getLocalizedMessage();
        return message == null || message.trim().isEmpty()
            ? error.getClass().getSimpleName()
            : message;
    }
}
