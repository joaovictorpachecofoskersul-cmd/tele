package br.com.acreditar.teleprompter;

import android.Manifest;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONObject;

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class MainActivity extends Activity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/assets/index.html";
    private static final int REQ_PERMS = 42;

    private WebView web;
    private PermissionRequest pendingRequest;
    private String pendingSharedText;
    private boolean pageReady = false;
    private final Map<String, OutputStream> uploads = new HashMap<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        web.setBackgroundColor(0xFF000000);
        setContentView(web);
        hideSystemBars();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !HOST.equals(request.getUrl().getHost());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                deliverSharedText();
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> handlePermission(request));
            }
        });

        web.addJavascriptInterface(new Bridge(), "Android");
        handleIntent(getIntent());
        web.loadUrl(START_URL);
    }

    private void hideSystemBars() {
        web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    /* ---------- permissões de câmera e microfone ---------- */

    private String[] neededPerms() {
        if (Build.VERSION.SDK_INT < 29) {
            return new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.WRITE_EXTERNAL_STORAGE};
        }
        return new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO};
    }

    private String[] missingPerms() {
        List<String> l = new ArrayList<>();
        for (String p : neededPerms()) {
            if (checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) l.add(p);
        }
        return l.toArray(new String[0]);
    }

    private void handlePermission(PermissionRequest request) {
        String[] missing = missingPerms();
        if (missing.length == 0) {
            request.grant(request.getResources());
        } else {
            if (pendingRequest != null) pendingRequest.deny();
            pendingRequest = request;
            requestPermissions(missing, REQ_PERMS);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode != REQ_PERMS || pendingRequest == null) return;
        boolean cam = checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
        boolean mic = checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        List<String> ok = new ArrayList<>();
        for (String r : pendingRequest.getResources()) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r) && cam) ok.add(r);
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r) && mic) ok.add(r);
        }
        if (ok.isEmpty()) pendingRequest.deny();
        else pendingRequest.grant(ok.toArray(new String[0]));
        pendingRequest = null;
    }

    /* ---------- texto compartilhado de outros apps ---------- */

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent != null && Intent.ACTION_SEND.equals(intent.getAction())) {
            String t = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (t != null && !t.isEmpty()) {
                pendingSharedText = t;
                deliverSharedText();
            }
        }
    }

    private void deliverSharedText() {
        if (!pageReady || pendingSharedText == null) return;
        String js = "window.tpSetText&&tpSetText(" + JSONObject.quote(pendingSharedText) + ")";
        pendingSharedText = null;
        web.evaluateJavascript(js, null);
    }

    /* ---------- botões físicos ---------- */

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
            String k = keyCode == KeyEvent.KEYCODE_VOLUME_UP ? "up" : "down";
            web.evaluateJavascript("window.tpKey&&tpKey('" + k + "')", null);
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.tpBack?tpBack():false", value -> {
            if (!"true".equals(value)) finish();
        });
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        hideSystemBars();
    }

    @Override
    protected void onDestroy() {
        synchronized (uploads) {
            for (OutputStream o : uploads.values()) closeQuiet(o);
            uploads.clear();
        }
        web.destroy();
        super.onDestroy();
    }

    /* ---------- ponte JavaScript: salvar vídeo na galeria ---------- */

    private static String safe(String name) {
        return name == null ? "video.mp4" : name.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private static void closeQuiet(OutputStream o) {
        if (o == null) return;
        try { o.close(); } catch (Exception ignored) { }
    }

    private static void copy(InputStream in, OutputStream out) throws Exception {
        byte[] buf = new byte[64 * 1024];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        out.flush();
    }

    private String saveToGallery(File src, String name, String mime) throws Exception {
        if (Build.VERSION.SDK_INT >= 29) {
            ContentValues cv = new ContentValues();
            cv.put(MediaStore.Video.Media.DISPLAY_NAME, name);
            cv.put(MediaStore.Video.Media.MIME_TYPE, mime);
            cv.put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/Teleprompter");
            cv.put(MediaStore.Video.Media.IS_PENDING, 1);
            Uri uri = getContentResolver().insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, cv);
            if (uri == null) throw new Exception("a galeria recusou o arquivo");
            try (InputStream in = new FileInputStream(src);
                 OutputStream out = getContentResolver().openOutputStream(uri)) {
                if (out == null) throw new Exception("não foi possível abrir a galeria");
                copy(in, out);
            }
            cv.clear();
            cv.put(MediaStore.Video.Media.IS_PENDING, 0);
            getContentResolver().update(uri, cv, null, null);
            return "Filmes/Teleprompter";
        } else {
            File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), "Teleprompter");
            if (!dir.exists() && !dir.mkdirs()) throw new Exception("sem permissão para criar a pasta");
            File dst = new File(dir, name);
            try (InputStream in = new FileInputStream(src);
                 OutputStream out = new FileOutputStream(dst)) {
                copy(in, out);
            }
            MediaScannerConnection.scanFile(this, new String[]{dst.getAbsolutePath()}, new String[]{mime}, null);
            return dst.getAbsolutePath();
        }
    }

    public class Bridge {
        @JavascriptInterface
        public String begin(String name) {
            synchronized (uploads) {
                try {
                    String n = safe(name);
                    closeQuiet(uploads.remove(n));
                    uploads.put(n, new BufferedOutputStream(new FileOutputStream(new File(getCacheDir(), n))));
                    return "ok";
                } catch (Exception e) {
                    return "erro: " + e.getMessage();
                }
            }
        }

        @JavascriptInterface
        public String chunk(String name, String b64) {
            synchronized (uploads) {
                try {
                    OutputStream o = uploads.get(safe(name));
                    if (o == null) return "erro: gravação não iniciada";
                    o.write(Base64.decode(b64, Base64.DEFAULT));
                    return "ok";
                } catch (Exception e) {
                    return "erro: " + e.getMessage();
                }
            }
        }

        @JavascriptInterface
        public String finish(String name, String mime) {
            synchronized (uploads) {
                String n = safe(name);
                File src = new File(getCacheDir(), n);
                try {
                    OutputStream o = uploads.remove(n);
                    if (o != null) o.close();
                    String m = (mime == null || mime.isEmpty()) ? "video/mp4" : mime;
                    String where = saveToGallery(src, n, m);
                    return "ok:" + where;
                } catch (Exception e) {
                    return "erro ao salvar: " + e.getMessage();
                } finally {
                    //noinspection ResultOfMethodCallIgnored
                    src.delete();
                }
            }
        }
    }
}
