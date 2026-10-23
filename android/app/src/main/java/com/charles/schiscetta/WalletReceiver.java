package com.charles.schiscetta;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Risposta dalla notifica: «Sì» la registra l'app alla prossima apertura (o subito se è aperta), «No, altro» la scarta. */
public class WalletReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        String pay = i.getStringExtra("pay");
        if (pay == null) return;
        WalletStore.setState(c, pay, WalletStore.ACTION_YES.equals(i.getAction()) ? "si" : "no");
        MainActivity.walletChanged();
    }
}
