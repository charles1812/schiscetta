package com.charles.schiscetta;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;

import java.io.File;
import java.io.FileNotFoundException;

/**
 * Espone un solo file (cache/scontrino.jpg) all'app fotocamera, che ci scrive la foto dello scontrino,
 * e alla WebView, che poi la legge. Sostituisce FileProvider di AndroidX (il progetto non usa Gradle).
 */
public class PhotoProvider extends ContentProvider {

    static final String AUTHORITY = "com.charles.schiscetta.photo";
    static final Uri URI = Uri.parse("content://" + AUTHORITY + "/scontrino.jpg");

    static File file(android.content.Context ctx) {
        return new File(ctx.getCacheDir(), "scontrino.jpg");
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        if (!"/scontrino.jpg".equals(uri.getPath())) throw new FileNotFoundException(uri.toString());
        int m = mode.contains("w") ? ParcelFileDescriptor.MODE_READ_WRITE | ParcelFileDescriptor.MODE_CREATE | ParcelFileDescriptor.MODE_TRUNCATE
                : ParcelFileDescriptor.MODE_READ_ONLY;
        return ParcelFileDescriptor.open(file(getContext()), m);
    }

    @Override public boolean onCreate() { return true; }
    @Override public String getType(Uri uri) { return "image/jpeg"; }
    @Override public Cursor query(Uri u, String[] p, String s, String[] a, String o) { return null; }
    @Override public Uri insert(Uri u, ContentValues v) { return null; }
    @Override public int delete(Uri u, String s, String[] a) { return 0; }
    @Override public int update(Uri u, ContentValues v, String s, String[] a) { return 0; }
}
