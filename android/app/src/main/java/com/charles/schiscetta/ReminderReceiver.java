package com.charles.schiscetta;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * Allarmi dell'app: il promemoria serale (ogni giorno all'orario scelto, solo se quella sera c'è da cucinare)
 * e i timer di cucina, che suonano anche con l'app chiusa.
 */
public class ReminderReceiver extends BroadcastReceiver {

    static final String PREFS = "schiscetta";
    static final String ACTION_REMIND = "com.charles.schiscetta.REMIND";
    static final String ACTION_TIMER = "com.charles.schiscetta.TIMER";
    private static final String CH_REMIND = "sera";
    private static final String CH_TIMER = "timer";
    private static final int REMIND_ID = 1;

    @Override
    public void onReceive(Context ctx, Intent intent) {
        String a = intent.getAction();
        if (ACTION_REMIND.equals(a)) {
            SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
            String text = "";
            try { text = new JSONObject(p.getString("plan", "{}")).optString(today, ""); } catch (Exception e) { /* piano non valido */ }
            if (!text.isEmpty()) notify(ctx, REMIND_ID, CH_REMIND, "Stasera si cucina 🍳", text);
            scheduleReminder(ctx);   // il prossimo, domani alla stessa ora
        } else if (ACTION_TIMER.equals(a)) {
            notify(ctx, intent.getIntExtra("id", 2), CH_TIMER, "⏰ Tempo scaduto", intent.getStringExtra("label"));
        }
    }

    static void scheduleReminder(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pi = PendingIntent.getBroadcast(ctx, REMIND_ID,
                new Intent(ctx, ReminderReceiver.class).setAction(ACTION_REMIND),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.cancel(pi);
        if (!p.getBoolean("on", false)) return;
        Calendar c = Calendar.getInstance();
        c.set(Calendar.HOUR_OF_DAY, p.getInt("h", 18));
        c.set(Calendar.MINUTE, p.getInt("m", 30));
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        if (c.getTimeInMillis() <= System.currentTimeMillis()) c.add(Calendar.DAY_OF_YEAR, 1);
        setAlarm(am, c.getTimeInMillis(), pi);
    }

    static void scheduleTimer(Context ctx, int id, int seconds, String label) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        setAlarm(am, System.currentTimeMillis() + seconds * 1000L, timerIntent(ctx, id, label));
    }

    static void cancelTimer(Context ctx, int id) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        am.cancel(timerIntent(ctx, id, ""));
        ((NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(id);
    }

    private static PendingIntent timerIntent(Context ctx, int id, String label) {
        Intent i = new Intent(ctx, ReminderReceiver.class).setAction(ACTION_TIMER).putExtra("id", id).putExtra("label", label);
        return PendingIntent.getBroadcast(ctx, id, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void setAlarm(AlarmManager am, long at, PendingIntent pi) {
        if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        else am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
    }

    private static void notify(Context ctx, int id, String channel, String title, String text) {
        if (Build.VERSION.SDK_INT >= 33 && ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm.getNotificationChannel(CH_REMIND) == null) {
            nm.createNotificationChannel(new NotificationChannel(CH_REMIND, "Promemoria serale", NotificationManager.IMPORTANCE_DEFAULT));
            NotificationChannel t = new NotificationChannel(CH_TIMER, "Timer di cucina", NotificationManager.IMPORTANCE_HIGH);
            t.enableVibration(true);
            t.setVibrationPattern(new long[]{0, 400, 200, 400, 200, 800});
            nm.createNotificationChannel(t);
        }
        Intent open = new Intent(ctx, MainActivity.class).putExtra("tab", "stasera");
        PendingIntent pi = PendingIntent.getActivity(ctx, id, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new Notification.Builder(ctx, channel)
                .setSmallIcon(R.drawable.ic_notif)
                .setColor(0xFFE0533B)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setContentIntent(pi)
                .setAutoCancel(true)
                .build();
        nm.notify(id, n);
    }
}
