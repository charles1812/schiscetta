package com.charles.schiscetta;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Pagamenti al supermercato letti da Google Wallet, salvati in SharedPreferences (funziona anche ad app chiusa).
 * stato: «attesa» (da chiedere), «si» (confermato dalla notifica, l'app lo registra all'apertura), «no», «fatto».
 */
final class WalletStore {
    static final String PREFS = "wallet";
    static final String CHANNEL = "wallet";
    static final String ACTION_YES = "com.charles.schiscetta.WALLET_SI";
    static final String ACTION_NO = "com.charles.schiscetta.WALLET_NO";

    private WalletStore() { }

    private static JSONArray load(Context c) {
        try { return new JSONArray(c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("items", "[]")); }
        catch (JSONException e) { return new JSONArray(); }
    }

    private static void store(Context c, JSONArray a) {
        // tengo gli ultimi 50
        JSONArray out = new JSONArray();
        for (int i = Math.max(0, a.length() - 50); i < a.length(); i++) out.put(a.opt(i));
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("items", out.toString()).apply();
    }

    /** aggiunge il pagamento; null se è un doppione (stessa notifica ripetuta) */
    static synchronized JSONObject add(Context c, long postTime, WalletParser.Pay p) {
        JSONArray a = load(c);
        for (int i = 0; i < a.length(); i++) {
            JSONObject x = a.optJSONObject(i);
            if (x != null && WalletParser.samePayment(x.optLong("ts"), x.optDouble("totale"), postTime, p.importo)) return null;
        }
        JSONObject it = new JSONObject();
        try {
            it.put("pay", WalletParser.pay(postTime, p.importo)).put("ts", postTime)
              .put("date", new SimpleDateFormat("yyyy-MM-dd", Locale.ITALY).format(new Date(postTime)))
              .put("negozio", p.negozio).put("totale", p.importo).put("stato", "attesa");
        } catch (JSONException e) { return null; }
        a.put(it);
        store(c, a);
        return it;
    }

    static synchronized void setState(Context c, String pay, String stato) {
        JSONArray a = load(c);
        for (int i = 0; i < a.length(); i++) {
            JSONObject x = a.optJSONObject(i);
            if (x != null && pay.equals(x.optString("pay"))) {
                try { x.put("stato", stato); } catch (JSONException ignored) { }
            }
        }
        store(c, a);
        c.getSystemService(NotificationManager.class).cancel(pay.hashCode());
    }

    /** quelli ancora da registrare nell'app: in attesa o confermati dalla notifica */
    static synchronized String pending(Context c) {
        JSONArray a = load(c), out = new JSONArray();
        for (int i = 0; i < a.length(); i++) {
            JSONObject x = a.optJSONObject(i);
            if (x != null && ("attesa".equals(x.optString("stato")) || "si".equals(x.optString("stato")))) out.put(x);
        }
        return out.toString();
    }

    /** «Spesa da Esselunga, 52,30 €: è la spesa della settimana?» con Sì / No, altro */
    static void notifyAsk(Context c, JSONObject it) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CHANNEL) == null)
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Spesa da Google Wallet", NotificationManager.IMPORTANCE_DEFAULT));
        String pay = it.optString("pay");
        int id = pay.hashCode();
        String msg = "Spesa da " + it.optString("negozio") + ", " + WalletParser.euro(it.optDouble("totale")) + ": è la spesa della settimana?";
        Intent open = new Intent(c, MainActivity.class).putExtra("tab", "spesa").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        Notification n = new Notification.Builder(c, CHANNEL)
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentTitle("🛒 Spesa da Google Wallet")
            .setContentText(msg)
            .setStyle(new Notification.BigTextStyle().bigText(msg))
            .setContentIntent(PendingIntent.getActivity(c, id, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT))
            .addAction(new Notification.Action.Builder(null, "Sì", answer(c, ACTION_YES, pay, id)).build())
            .addAction(new Notification.Action.Builder(null, "No, altro", answer(c, ACTION_NO, pay, id + 1)).build())
            .setAutoCancel(true)
            .build();
        nm.notify(id, n);
    }

    private static PendingIntent answer(Context c, String action, String pay, int req) {
        Intent i = new Intent(c, WalletReceiver.class).setAction(action).putExtra("pay", pay);
        return PendingIntent.getBroadcast(c, req, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }
}
