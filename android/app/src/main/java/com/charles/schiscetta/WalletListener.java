package com.charles.schiscetta;

import android.app.Notification;
import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONObject;

/**
 * Legge solo le notifiche di Google Wallet (e, nelle build di debug, quelle della shell per le prove con adb).
 * Tiene i pagamenti nei supermercati e chiede con una notifica se sono la spesa della settimana.
 */
public class WalletListener extends NotificationListenerService {
    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        boolean debug = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        if (!WalletParser.accepts(sbn.getPackageName(), debug)) return;
        Bundle ex = sbn.getNotification().extras;
        String title = str(ex.getCharSequence(Notification.EXTRA_TITLE));
        String text = str(ex.getCharSequence(Notification.EXTRA_BIG_TEXT));
        if (text.isEmpty()) text = str(ex.getCharSequence(Notification.EXTRA_TEXT));
        WalletParser.Pay p = WalletParser.parse(title, text);
        if (p == null) return;
        JSONObject it = WalletStore.add(this, sbn.getPostTime(), p);
        if (it == null) return;                    // stessa notifica già vista
        WalletStore.notifyAsk(this, it);
        MainActivity.walletChanged();
    }

    private static String str(CharSequence s) { return s == null ? "" : s.toString(); }
}
