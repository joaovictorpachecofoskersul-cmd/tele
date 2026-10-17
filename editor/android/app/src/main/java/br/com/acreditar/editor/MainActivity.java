package br.com.acreditar.editor;

import android.app.Activity;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Intent;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

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
    private static final int REQ_FILES = 11;
    private static final int REQ_MIC = 12;
    private PermissionRequest pendingMic;

    private WebView web;
    private ValueCallback<Uri[]> fileCallback;
    private final Map<String, OutputStream> uploads = new HashMap<>();
    private Uri lastSaved;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT < 29 && checkSelfPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE) != 0) {
            requestPermissions(new String[]{android.Manifest.permission.WRITE_EXTERNAL_STORAGE}, 3);
        }

        web = new WebView(this);
        web.setBackgroundColor(0xFF0B0B0E);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse r = loader.shouldInterceptRequest(request.getUrl());
                if (r != null) {
                    // isolamento de origem: libera várias linhas de processamento para a legenda automática
                    Map<String, String> hdr = new HashMap<>();
                    if (r.getResponseHeaders() != null) hdr.putAll(r.getResponseHeaders());
                    hdr.put("Cross-Origin-Opener-Policy", "same-origin");
                    hdr.put("Cross-Origin-Embedder-Policy", "require-corp");
                    hdr.put("Cross-Origin-Resource-Policy", "same-origin");
                    String path = request.getUrl().getPath();
                    String mime = r.getMimeType();
                    if (path != null && (path.endsWith(".mjs") || path.endsWith(".js"))) mime = "text/javascript";
                    if (path != null && path.endsWith(".wasm")) mime = "application/wasm";
                    WebResourceResponse out = new WebResourceResponse(mime, r.getEncoding(), r.getData());
                    out.setResponseHeaders(hdr);
                    return out;
                }
                return null;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !HOST.equals(request.getUrl().getHost());
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    // microfone (narração) e câmera (teleprompter)
                    java.util.List<String> need = new java.util.ArrayList<>();
                    for (String r : request.getResources()) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r) && checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != 0) need.add(android.Manifest.permission.RECORD_AUDIO);
                        if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r) && checkSelfPermission(android.Manifest.permission.CAMERA) != 0) need.add(android.Manifest.permission.CAMERA);
                    }
                    if (need.isEmpty()) { grantAllowed(request); return; }
                    if (pendingMic != null) pendingMic.deny();
                    pendingMic = request;
                    requestPermissions(need.toArray(new String[0]), REQ_MIC);
                });
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                String[] types = mimeTypes(params.getAcceptTypes());
                i.setType(types.length == 1 ? types[0] : "*/*");
                if (types.length > 1) i.putExtra(Intent.EXTRA_MIME_TYPES, types);
                if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                try {
                    startActivityForResult(i, REQ_FILES);
                } catch (Exception e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        web.addJavascriptInterface(new Bridge(), "Android");
        web.loadUrl(START_URL);
    }

    private static String[] mimeTypes(String[] accept) {
        List<String> out = new ArrayList<>();
        if (accept != null) {
            for (String a : accept) {
                if (a == null) continue;
                for (String p : a.split(",")) {
                    p = p.trim();
                    if (p.isEmpty()) continue;
                    if (p.startsWith(".")) continue;
                    out.add(p);
                }
            }
        }
        if (out.isEmpty()) out.add("*/*");
        return out.toArray(new String[0]);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_FILES || fileCallback == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null) {
            ClipData clip = data.getClipData();
            if (clip != null) {
                result = new Uri[clip.getItemCount()];
                for (int k = 0; k < clip.getItemCount(); k++) result[k] = clip.getItemAt(k).getUri();
            } else if (data.getData() != null) {
                result = new Uri[]{data.getData()};
            }
        }
        fileCallback.onReceiveValue(result);
        fileCallback = null;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == REQ_MIC && pendingMic != null) {
            grantAllowed(pendingMic);
            pendingMic = null;
        }
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.edBack ? edBack() : false", value -> {
            if (!"true".equals(value)) finish();
        });
    }

    @Override
    protected void onPause() { super.onPause(); web.onPause(); }

    @Override
    protected void onResume() { super.onResume(); web.onResume(); }

    @Override
    protected void onDestroy() {
        synchronized (uploads) {
            for (OutputStream o : uploads.values()) { try { o.close(); } catch (Exception ignored) { } }
            uploads.clear();
        }
        web.destroy();
        super.onDestroy();
    }

    private void grantAllowed(PermissionRequest request) {
        java.util.List<String> ok = new java.util.ArrayList<>();
        for (String r : request.getResources()) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r) && checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) == 0) ok.add(r);
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r) && checkSelfPermission(android.Manifest.permission.CAMERA) == 0) ok.add(r);
        }
        if (ok.isEmpty()) request.deny(); else request.grant(ok.toArray(new String[0]));
    }

    /* ---------- salvar na galeria ---------- */

    private static String safe(String name) {
        return name == null ? "video.mp4" : name.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private Uri saveToGallery(File src, String name, String mime) throws Exception {
        lastMime = mime;
        if (!mime.startsWith("video/")) return saveToDownloads(src, name, mime);
        if (Build.VERSION.SDK_INT >= 29) {
            ContentValues cv = new ContentValues();
            cv.put(MediaStore.Video.Media.DISPLAY_NAME, name);
            cv.put(MediaStore.Video.Media.MIME_TYPE, mime);
            cv.put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/Editor");
            cv.put(MediaStore.Video.Media.IS_PENDING, 1);
            Uri uri = getContentResolver().insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, cv);
            if (uri == null) throw new Exception("a galeria recusou o arquivo");
            try (InputStream in = new FileInputStream(src); OutputStream out = getContentResolver().openOutputStream(uri)) {
                if (out == null) throw new Exception("não foi possível gravar");
                byte[] buf = new byte[256 * 1024]; int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            }
            cv.clear();
            cv.put(MediaStore.Video.Media.IS_PENDING, 0);
            getContentResolver().update(uri, cv, null, null);
            return uri;
        } else {
            File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), "Editor");
            if (!dir.exists() && !dir.mkdirs()) throw new Exception("sem permissão para criar a pasta");
            File dst = new File(dir, name);
            try (InputStream in = new FileInputStream(src); OutputStream out = new FileOutputStream(dst)) {
                byte[] buf = new byte[256 * 1024]; int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            }
            final Uri[] got = new Uri[1];
            final Object lock = new Object();
            MediaScannerConnection.scanFile(this, new String[]{dst.getAbsolutePath()}, new String[]{mime}, (p, u) -> {
                synchronized (lock) { got[0] = u; lock.notifyAll(); }
            });
            synchronized (lock) { if (got[0] == null) lock.wait(5000); }
            return got[0] != null ? got[0] : Uri.fromFile(dst);
        }
    }

    private String lastMime = "video/mp4";

    // legendas (.srt), textos: vão para Downloads/Editor
    private Uri saveToDownloads(File src, String name, String mime) throws Exception {
        if (Build.VERSION.SDK_INT >= 29) {
            ContentValues cv = new ContentValues();
            cv.put(MediaStore.Downloads.DISPLAY_NAME, name);
            cv.put(MediaStore.Downloads.MIME_TYPE, mime);
            cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Editor");
            Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
            if (uri == null) throw new Exception("não foi possível criar o arquivo");
            try (InputStream in = new FileInputStream(src); OutputStream out = getContentResolver().openOutputStream(uri)) {
                if (out == null) throw new Exception("não foi possível gravar");
                byte[] buf = new byte[64 * 1024]; int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            }
            return uri;
        }
        File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "Editor");
        if (!dir.exists() && !dir.mkdirs()) throw new Exception("sem permissão para criar a pasta");
        File dst = new File(dir, name);
        try (InputStream in = new FileInputStream(src); OutputStream out = new FileOutputStream(dst)) {
            byte[] buf = new byte[64 * 1024]; int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        }
        return Uri.fromFile(dst);
    }

    public class Bridge {
        @JavascriptInterface
        public String begin(String name) {
            synchronized (uploads) {
                try {
                    String n = safe(name);
                    OutputStream old = uploads.remove(n);
                    if (old != null) old.close();
                    uploads.put(n, new BufferedOutputStream(new FileOutputStream(new File(getCacheDir(), n))));
                    return "ok";
                } catch (Exception e) { return "erro: " + e.getMessage(); }
            }
        }

        @JavascriptInterface
        public String chunk(String name, String b64) {
            synchronized (uploads) {
                try {
                    OutputStream o = uploads.get(safe(name));
                    if (o == null) return "erro: arquivo não iniciado";
                    o.write(Base64.decode(b64, Base64.DEFAULT));
                    return "ok";
                } catch (Exception e) { return "erro: " + e.getMessage(); }
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
                    lastSaved = saveToGallery(src, n, (mime == null || mime.isEmpty()) ? "video/mp4" : mime);
                    return "ok";
                } catch (Exception e) {
                    return "erro ao salvar: " + e.getMessage();
                } finally {
                    //noinspection ResultOfMethodCallIgnored
                    src.delete();
                }
            }
        }

        @JavascriptInterface
        public void shareLast() {
            final Uri u = lastSaved;
            if (u == null) return;
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType(lastMime != null && lastMime.startsWith("video/") ? "video/*" : lastMime);
                i.putExtra(Intent.EXTRA_STREAM, u);
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                startActivity(Intent.createChooser(i, "Enviar vídeo"));
            });
        }
    }
}
