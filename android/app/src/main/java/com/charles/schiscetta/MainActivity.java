package com.charles.schiscetta;

import android.Manifest;
import android.app.Activity;
import android.app.Dialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.content.ComponentName;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Schiscetta: una WebView che carica l'app HTML offline da assets/index.html.
 * I dati stanno nel localStorage della WebView; il ponte "Native" aggiunge notifiche, timer,
 * condivisione e schermo sempre acceso mentre si cucina.
 */
public class MainActivity extends Activity {

    private static final int PICK_PHOTO = 7, CAMERA_REQ = 8, PHOTO_CAMERA_REQ = 9;
    private PermissionRequest camRequest;
    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private String userAgent;
    /** l'attività aperta, per avvisare l'app web quando arriva un pagamento da Google Wallet */
    private static volatile MainActivity live;
    /** siti che l'app può leggere direttamente (Coop e Conad bloccano il server, quindi li legge il telefono) */
    private static final String[] HTTP_HOSTS = {"www.easycoop.com", "spesaonline.conad.it", "www.iperalspesaonline.it"};
    private static final String IPERAL = "https://www.iperalspesaonline.it/";
    /** mette nel carrello Iperal i prodotti scelti, con le API che usa il sito stesso (sessione di chi è entrato) */
    private static final String IPERAL_ADD = "(async function(){var I=@@ITEMS@@;try{"
        + "var u=await (await fetch('/ebsn/api/auth/test',{credentials:'include'})).json();"
        + "if(!(u.user&&u.user.userId>-1)){SchiscettaIperal.cart(JSON.stringify({ok:false,err:'login'}));return;}"
        + "var r=await fetch('/ebsn/api/cart/add?show_sectors=false',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},"
        + "body:JSON.stringify({items:I.map(function(i){return {productId:i.id,quantity:i.q,infos:{accept_alternatives:true}};})})});"
        + "var j=await r.json(),e=j.response&&j.response.errors&&j.response.errors[0];"
        + "SchiscettaIperal.cart(JSON.stringify({ok:!!(j.response&&j.response.status===0),err:e?(e.error||''):'',n:I.length}));"
        + "}catch(x){SchiscettaIperal.cart(JSON.stringify({ok:false,err:String(x)}));}})()";
    private static final String IPERAL_LOGIN = "fetch('/ebsn/api/auth/test',{credentials:'include'}).then(function(r){return r.json();})"
        + ".then(function(u){SchiscettaIperal.login(u.user&&u.user.userId>-1?'1':'0');}).catch(function(){SchiscettaIperal.login('0');})";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyBars(false);

        // build di debug (tools/build_apk.py --debug): WebView ispezionabile dal PC per le prove
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) WebView.setWebContentsDebuggingEnabled(true);
        web = new WebView(this);
        web.setFitsSystemWindows(true);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setTextZoom(100);
        web.addJavascriptInterface(new Bridge(), "Native");
        userAgent = s.getUserAgentString();
        CookieManager.getInstance().setAcceptCookie(true);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if ("http".equals(u.getScheme()) || "https".equals(u.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (ActivityNotFoundException e) { /* nessun browser */ }
                    return true;
                }
                return false;
            }
        });

        // Foto dello scontrino: fotocamera (scrive in PhotoProvider) oppure galleria
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(android.webkit.ConsoleMessage m) {
                android.util.Log.d("Schiscetta", m.message() + " (" + m.lineNumber() + ")");   // visibile con adb logcat
                return true;
            }

            /** fotocamera per lo scanner dei codici a barre: solo per la pagina dell'app, chiedendo il permesso la prima volta */
            @Override
            public void onPermissionRequest(PermissionRequest r) {
                boolean video = false;
                for (String res : r.getResources()) video |= PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(res);
                if (!video) { r.deny(); return; }
                if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                    r.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                } else {
                    camRequest = r;
                    requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_REQ);
                }
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                // con il permesso CAMERA dichiarato (scanner), Android apre la fotocamera solo se il permesso è concesso
                if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.CAMERA}, PHOTO_CAMERA_REQ);
                    return true;
                }
                openPhotoChooser(true);
                return true;
            }
        });

        live = this;
        String tab = getIntent().getStringExtra("tab");
        String hash = "stasera".equals(tab) || "spesa".equals(tab) ? "#" + tab : "";
        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl("file:///android_asset/index.html" + hash);
    }

    /** foto dello scontrino o dei prodotti: fotocamera (se c'è il permesso) oppure galleria */
    private void openPhotoChooser(boolean withCamera) {
        PhotoProvider.file(MainActivity.this).delete();
        Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        camera.putExtra(MediaStore.EXTRA_OUTPUT, PhotoProvider.URI);
        camera.setClipData(ClipData.newRawUri("", PhotoProvider.URI));
        camera.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        Intent gallery = new Intent(Intent.ACTION_GET_CONTENT);
        gallery.addCategory(Intent.CATEGORY_OPENABLE);
        gallery.setType("image/*");
        Intent chooser = Intent.createChooser(gallery, "Scegli o scatta la foto");
        if (withCamera) chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
        try {
            startActivityForResult(chooser, PICK_PHOTO);
        } catch (ActivityNotFoundException e) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = null;
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String tab = intent.getStringExtra("tab");
        if ("stasera".equals(tab) || "spesa".equals(tab))
            web.evaluateJavascript("window.__openTab && window.__openTab('" + tab + "')", null);
        web.evaluateJavascript("window.__wallet && window.__wallet()", null);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == PICK_PHOTO && fileCallback != null) {
            Uri[] result = null;
            if (resultCode == RESULT_OK) {
                if (data != null && data.getData() != null) result = new Uri[]{data.getData()};          // dalla galleria
                else if (PhotoProvider.file(this).length() > 0) result = new Uri[]{PhotoProvider.URI};     // dalla fotocamera
            }
            fileCallback.onReceiveValue(result);
            fileCallback = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    protected void onResume() {
        super.onResume();
        // ogni volta che si torna nell'app: prezzi aggiornati (l'app HTML evita doppioni ravvicinati)
        if (web != null) web.evaluateJavascript("window.__onResume && window.__onResume()", null);
    }

    @Override
    protected void onDestroy() {
        if (live == this) live = null;
        super.onDestroy();
    }

    /** è arrivato (o è stato confermato dalla notifica) un pagamento da Google Wallet: l'app web lo propone subito */
    static void walletChanged() {
        MainActivity a = live;
        if (a != null) a.runOnUiThread(() -> a.web.evaluateJavascript("window.__wallet && window.__wallet()", null));
    }

    /** l'aggiornamento non è andato: lo dico all'app web */
    static void updateFailed(String msg) {
        MainActivity a = live;
        if (a != null) a.runOnUiThread(() -> a.web.evaluateJavascript("window.__updateDone && window.__updateDone(" + JSONObject.quote(msg == null ? "installazione annullata" : msg) + ")", null));
    }

    private boolean walletListenerOn() {
        String on = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
        return on != null && on.contains(new ComponentName(this, WalletListener.class).flattenToString());
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    public void onBackPressed() {
        // L'app HTML chiude i fogli aperti e torna al menu; dal menu si esce.
        web.evaluateJavascript("window.__back ? window.__back() : false", value -> {
            if (!"true".equals(value)) MainActivity.super.onBackPressed();
        });
    }

    /** Colori di barra di stato e navigazione allineati al tema dell'app. */
    @SuppressWarnings("deprecation")
    private void applyBars(boolean dark) {
        Window w = getWindow();
        w.setStatusBarColor(dark ? 0xFF161311 : 0xFFFBF7F2);
        w.setNavigationBarColor(dark ? 0xFF211D1A : 0xFFFFFFFF);
        View decor = w.getDecorView();
        int f = decor.getSystemUiVisibility();
        int light = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        decor.setSystemUiVisibility(dark ? (f & ~light) : (f | light));
    }

    /** Il sito Conad dentro l'app: lì si sceglie il negozio (con le sue verifiche), la sessione resta nei cookie. */
    private void openConad() {
        Dialog d = new Dialog(this, android.R.style.Theme_DeviceDefault_Light_NoActionBar);
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(32, 16, 16, 16);
        bar.setBackgroundColor(0xFFE2001A);
        TextView title = new TextView(this);
        title.setText("Scegli il tuo Conad");
        title.setTextColor(Color.WHITE);
        title.setTextSize(17);
        bar.addView(title, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        Button done = new Button(this);
        done.setText("Fatto");
        bar.addView(done);
        box.addView(bar);
        WebView w = new WebView(this);
        WebSettings ws = w.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(w, true);
        w.setWebViewClient(new WebViewClient());     // i link restano dentro questa finestra
        w.setWebChromeClient(new WebChromeClient());
        box.addView(w, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1));
        done.setOnClickListener(v -> w.evaluateJavascript("(function(){var t=document.body.innerText,m=t.match(/Punto di ritiro:\\s*([^\\n]+)/)||t.match(/Consegna a:\\s*([^\\n]+)/);return m?m[1].replace(/\\s*Modifica\\s*$/,''):''})()", label -> {
            d.dismiss();
            web.evaluateJavascript("window.__conadStore && window.__conadStore(" + label + ")", null);
        }));
        d.setOnDismissListener(x -> { CookieManager.getInstance().flush(); w.destroy(); });
        d.setContentView(box);
        d.show();
        w.loadUrl("https://spesaonline.conad.it/");
    }

    /** Il sito Iperal dentro l'app: entri con il tuo account (la password la scrivi tu sul sito, l'app non la vede) e la
     *  sessione resta nei cookie, così l'app legge i prezzi del tuo punto vendita. Con una lista (items) mette i prodotti
     *  nel carrello Iperal e apre il carrello: restano da scegliere la fascia di ritiro e da pagare, sul sito. */
    private void openIperal(String items) {
        Dialog d = new Dialog(this, android.R.style.Theme_DeviceDefault_Light_NoActionBar);
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(32, 16, 16, 16);
        bar.setBackgroundColor(0xFF00853F);
        TextView title = new TextView(this);
        title.setText(items == null ? "Iperal: entra con il tuo account" : "Carrello Iperal");
        title.setTextColor(Color.WHITE);
        title.setTextSize(17);
        bar.addView(title, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        Button done = new Button(this);
        done.setText("Fatto");
        bar.addView(done);
        box.addView(bar);
        WebView w = new WebView(this);
        WebSettings ws = w.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(w, true);
        final boolean[] sent = {false}, closing = {false};
        w.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void cart(String res) {
                runOnUiThread(() -> {
                    web.evaluateJavascript("window.__iperalCart && window.__iperalCart(" + JSONObject.quote(res) + ")", null);
                    w.loadUrl(IPERAL + "cart");
                });
            }
            @JavascriptInterface
            public void login(String ok) {
                runOnUiThread(() -> {
                    web.evaluateJavascript("window.__iperalLogin && window.__iperalLogin(" + ("1".equals(ok)) + ")", null);
                    if (closing[0]) d.dismiss();
                });
            }
        }, "SchiscettaIperal");
        w.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView v, String url) {
                if (items == null || sent[0] || !url.startsWith(IPERAL)) return;
                sent[0] = true;
                v.evaluateJavascript(IPERAL_ADD.replace("@@ITEMS@@", items), null);
            }
        });
        w.setWebChromeClient(new WebChromeClient());
        box.addView(w, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1));
        done.setOnClickListener(v -> { closing[0] = true; w.evaluateJavascript(IPERAL_LOGIN, null); w.postDelayed(d::dismiss, 4000); });
        d.setOnDismissListener(x -> { CookieManager.getInstance().flush(); w.destroy(); });
        d.setContentView(box);
        d.show();
        w.loadUrl(IPERAL);
    }

    /** Richiesta HTTP fatta dal telefono (niente CORS); con «pick» torna solo le parti utili della pagina. */
    private void httpRequest(int id, String method, String url, String headers, String body, String pick) {
        int status;
        String text;
        try {
            URL u = new URL(url);
            boolean known = false;
            for (String h : HTTP_HOSTS) known |= h.equals(u.getHost());
            if (!"https".equals(u.getProtocol()) || !known) throw new SecurityException("sito non consentito");
            HttpURLConnection c = (HttpURLConnection) u.openConnection();
            c.setRequestMethod(method);
            c.setConnectTimeout(20000);
            c.setReadTimeout(40000);
            c.setRequestProperty("User-Agent", userAgent);
            c.setRequestProperty("Accept-Language", "it-IT,it;q=0.9");
            String ck = CookieManager.getInstance().getCookie(url);
            if (ck != null) c.setRequestProperty("Cookie", ck);
            JSONObject h = new JSONObject(headers == null || headers.isEmpty() ? "{}" : headers);
            for (Iterator<String> it = h.keys(); it.hasNext(); ) { String k = it.next(); c.setRequestProperty(k, h.getString(k)); }
            if (body != null && !body.isEmpty()) {
                c.setDoOutput(true);
                try (OutputStream o = c.getOutputStream()) { o.write(body.getBytes(StandardCharsets.UTF_8)); }
            }
            status = c.getResponseCode();
            InputStream in = status >= 400 ? c.getErrorStream() : c.getInputStream();
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            if (in != null) {
                byte[] b = new byte[16384];
                for (int n; (n = in.read(b)) > 0; ) buf.write(b, 0, n);
                in.close();
            }
            text = buf.toString("UTF-8");
            c.disconnect();
            if (pick != null && !pick.isEmpty()) {
                JSONArray arr = new JSONArray();
                Matcher m = Pattern.compile(pick).matcher(text);
                while (m.find()) arr.put(m.group(1));
                text = arr.toString();
            }
        } catch (Exception e) {
            status = -1;
            text = String.valueOf(e.getMessage());
        }
        String js = "window.__http && window.__http(" + id + "," + status + "," + JSONObject.quote(text) + ")";
        runOnUiThread(() -> web.evaluateJavascript(js, null));
    }

    private class Bridge {
        /** versione installata: {"code":19,"name":"1.19"} */
        @JavascriptInterface
        public String appVersion() {
            try {
                android.content.pm.PackageInfo pi = getPackageManager().getPackageInfo(getPackageName(), 0);
                long code = Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : pi.versionCode;
                return new JSONObject().put("code", code).put("name", pi.versionName).toString();
            } catch (Exception e) { return "{}"; }
        }

        @JavascriptInterface
        public boolean canInstall() { return Updater.canInstall(MainActivity.this); }

        @JavascriptInterface
        public void allowInstall() {
            runOnUiThread(() -> { try { startActivity(Updater.allowIntent(MainActivity.this)); } catch (ActivityNotFoundException ignored) { } });
        }

        /** scarica e installa la nuova versione sopra questa (i dati restano) */
        @JavascriptInterface
        public void update(String url) {
            Updater.install(MainActivity.this, url, err -> runOnUiThread(() ->
                web.evaluateJavascript("window.__updateDone && window.__updateDone(" + (err == null ? "null" : JSONObject.quote(err)) + ")", null)));
        }

        @JavascriptInterface
        public String walletList() { return WalletStore.pending(MainActivity.this); }

        @JavascriptInterface
        public String walletAll() { return WalletStore.all(MainActivity.this); }

        @JavascriptInterface
        public void walletDone(String pay) { WalletStore.setState(MainActivity.this, pay, "fatto"); }

        @JavascriptInterface
        public void walletNo(String pay) { WalletStore.setState(MainActivity.this, pay, "no"); }

        @JavascriptInterface
        public boolean walletEnabled() { return walletListenerOn(); }

        @JavascriptInterface
        public void walletSettings() {
            runOnUiThread(() -> {
                ComponentName cn = new ComponentName(MainActivity.this, WalletListener.class);
                Intent i = Build.VERSION.SDK_INT >= 30
                    ? new Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS).putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME, cn.flattenToString())
                    : new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
                try { startActivity(i); }
                catch (ActivityNotFoundException e) {
                    try { startActivity(new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")); } catch (ActivityNotFoundException ignored) { }
                }
            });
        }

        @JavascriptInterface
        public void http(int id, String method, String url, String headers, String body, String pick) {
            new Thread(() -> httpRequest(id, method, url, headers, body, pick)).start();
        }

        @JavascriptInterface
        public boolean metered() {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            return cm == null || cm.isActiveNetworkMetered();
        }

        @JavascriptInterface
        public void conadStore() {
            runOnUiThread(MainActivity.this::openConad);
        }

        /** sito Iperal per entrare con il proprio account */
        @JavascriptInterface
        public void iperalOpen() {
            runOnUiThread(() -> openIperal(null));
        }

        /** mette nel carrello Iperal [{id, q}] (q: pezzi, oppure kg per i prodotti sfusi) e apre il carrello */
        @JavascriptInterface
        public void iperalCart(String items) {
            final String clean;
            try { clean = new JSONArray(items).toString(); } catch (Exception e) { return; }      // solo una lista JSON valida
            runOnUiThread(() -> openIperal(clean));
        }

        @JavascriptInterface
        public void share(String text, String title) {
            runOnUiThread(() -> {
                Intent send = new Intent(Intent.ACTION_SEND);
                send.setType("text/plain");
                send.putExtra(Intent.EXTRA_SUBJECT, title);
                send.putExtra(Intent.EXTRA_TEXT, text);
                try { startActivity(Intent.createChooser(send, title)); } catch (ActivityNotFoundException e) { /* niente da fare */ }
            });
        }

        @JavascriptInterface
        public void startTimer(int id, int seconds, String label) {
            ReminderReceiver.scheduleTimer(MainActivity.this, id, seconds, label);
        }

        @JavascriptInterface
        public void cancelTimer(int id) {
            ReminderReceiver.cancelTimer(MainActivity.this, id);
        }

        @JavascriptInterface
        public void setReminder(boolean on, int hour, int minute, String planJson) {
            SharedPreferences.Editor e = getSharedPreferences(ReminderReceiver.PREFS, MODE_PRIVATE).edit();
            e.putBoolean("on", on).putInt("h", hour).putInt("m", minute).putString("plan", planJson).apply();
            ReminderReceiver.scheduleReminder(MainActivity.this);
        }

        @JavascriptInterface
        public void askNotifications() {
            if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
                runOnUiThread(() -> requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1));
        }

        @JavascriptInterface
        public void keepScreenOn(boolean on) {
            runOnUiThread(() -> {
                if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }

        @JavascriptInterface
        public void setDark(boolean dark) {
            runOnUiThread(() -> applyBars(dark));
        }
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        super.onRequestPermissionsResult(code, perms, results);
        boolean ok = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
        if (code == PHOTO_CAMERA_REQ) { if (fileCallback != null) openPhotoChooser(ok); return; }   // senza permesso: solo galleria
        if (code != CAMERA_REQ || camRequest == null) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) camRequest.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
        else camRequest.deny();
        camRequest = null;
    }
}
