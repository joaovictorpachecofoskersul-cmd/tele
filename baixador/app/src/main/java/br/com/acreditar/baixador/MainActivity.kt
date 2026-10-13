package br.com.acreditar.baixador

import android.Manifest
import android.app.Activity
import android.content.ClipboardManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.view.Gravity
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.webkit.CookieManager
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import com.yausername.ffmpeg.FFmpeg
import com.yausername.youtubedl_android.YoutubeDL
import com.yausername.youtubedl_android.YoutubeDLRequest
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class MainActivity : Activity() {

    companion object {
        private const val JOB_ID = "baixador-job"
        private const val REQ_LOGIN = 7
        private const val REQ_STORAGE = 8
        private const val DAY_MS = 24L * 60 * 60 * 1000
        private val URL_RE = Regex("https?://[^\\s\"'<>]+")

        fun cookieFile(c: Context) = File(c.filesDir, "instagram_cookies.txt")
    }

    private val io = Executors.newSingleThreadExecutor()
    private val ui = Handler(Looper.getMainLooper())
    private val prefs by lazy { getSharedPreferences("baixador", MODE_PRIVATE) }

    @Volatile private var engineReady = false
    @Volatile private var busy = false
    private var pendingUrl: String? = null

    private lateinit var urlField: EditText
    private lateinit var btnDownload: Button
    private lateinit var btnCancel: Button
    private lateinit var progress: ProgressBar
    private lateinit var status: TextView
    private lateinit var history: LinearLayout
    private lateinit var igStatus: TextView
    private lateinit var btnLogin: Button
    private lateinit var engine: TextView
    private lateinit var btnUpdate: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        urlField = findViewById(R.id.url)
        btnDownload = findViewById(R.id.btnDownload)
        btnCancel = findViewById(R.id.btnCancel)
        progress = findViewById(R.id.progress)
        status = findViewById(R.id.status)
        history = findViewById(R.id.history)
        igStatus = findViewById(R.id.igStatus)
        btnLogin = findViewById(R.id.btnLogin)
        engine = findViewById(R.id.engine)
        btnUpdate = findViewById(R.id.btnUpdate)

        findViewById<Button>(R.id.btnPaste).setOnClickListener { pasteFromClipboard() }
        btnDownload.setOnClickListener { startFromField() }
        btnCancel.setOnClickListener {
            YoutubeDL.getInstance().destroyProcessById(JOB_ID)
            status.text = "Cancelando..."
        }
        btnLogin.setOnClickListener {
            if (cookieFile(this).exists()) logoutInstagram()
            else startActivityForResult(Intent(this, LoginActivity::class.java), REQ_LOGIN)
        }
        btnUpdate.setOnClickListener { updateEngine(force = true) }

        refreshInstagramState()
        renderHistory()
        askStorageIfNeeded()
        initEngine()
        handleIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQ_LOGIN) {
            refreshInstagramState()
            if (resultCode == RESULT_OK) toast("Instagram conectado. Já dá para baixar stories.")
        }
    }

    /* ---------------- motor (yt-dlp) ---------------- */

    private fun initEngine() {
        io.execute {
            try {
                YoutubeDL.getInstance().init(applicationContext)
                FFmpeg.getInstance().init(applicationContext)
                engineReady = true
                ui.post {
                    status.text = "Pronto. Cole um link ou compartilhe um vídeo para cá."
                    showEngineVersion()
                }
                val last = prefs.getLong("lastUpdate", 0)
                if (System.currentTimeMillis() - last > DAY_MS) updateEngineNow(silent = true)
                ui.post { pendingUrl?.let { pendingUrl = null; download(it) } }
            } catch (e: Throwable) {
                ui.post { status.text = "Não consegui iniciar o motor de download: ${e.message}" }
            }
        }
    }

    private fun showEngineVersion() {
        val v = try { YoutubeDL.getInstance().version(applicationContext) } catch (e: Throwable) { null }
        engine.text = "Versão do yt-dlp: ${v ?: "desconhecida"}. Atualiza sozinho uma vez por dia. Se algum link parar de funcionar, toque em Atualizar."
    }

    private fun updateEngine(force: Boolean) {
        if (!engineReady) { toast("Aguarde o motor terminar de carregar"); return }
        btnUpdate.isEnabled = false
        engine.text = "Atualizando o motor..."
        io.execute {
            updateEngineNow(silent = !force)
            ui.post { btnUpdate.isEnabled = true }
        }
    }

    /** roda na thread de trabalho */
    private fun updateEngineNow(silent: Boolean) {
        try {
            val st = YoutubeDL.getInstance().updateYoutubeDL(applicationContext)
            prefs.edit().putLong("lastUpdate", System.currentTimeMillis()).apply()
            ui.post {
                showEngineVersion()
                if (!silent) toast(if (st?.name == "DONE") "Motor atualizado" else "O motor já está na versão mais nova")
            }
        } catch (e: Throwable) {
            ui.post {
                showEngineVersion()
                if (!silent) toast("Não consegui atualizar agora. Verifique a internet.")
            }
        }
    }

    /* ---------------- entrada de links ---------------- */

    private fun handleIntent(i: Intent?) {
        if (i?.action != Intent.ACTION_SEND) return
        val text = i.getStringExtra(Intent.EXTRA_TEXT) ?: return
        val url = extractUrl(text) ?: run { toast("Não encontrei um link no que foi compartilhado"); return }
        urlField.setText(url)
        i.action = null
        if (engineReady) download(url) else { pendingUrl = url; status.text = "Link recebido. Preparando o motor..." }
    }

    private fun extractUrl(text: String): String? =
        URL_RE.find(text)?.value?.trimEnd('.', ',', ')', ']', '!', '?')

    private fun pasteFromClipboard() {
        val cm = getSystemService(CLIPBOARD_SERVICE) as ClipboardManager
        val t = cm.primaryClip?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.coerceToText(this)?.toString()
        val url = t?.let { extractUrl(it) }
        if (url == null) toast("Não tem link copiado") else urlField.setText(url)
    }

    private fun startFromField() {
        val url = extractUrl(urlField.text.toString())
        if (url == null) { toast("Cole um link válido"); return }
        if (!engineReady) { pendingUrl = url; status.text = "Aguarde, preparando o motor..."; return }
        download(url)
    }

    /* ---------------- download ---------------- */

    private fun isInstagram(url: String) = Uri.parse(url).host?.contains("instagram.com") == true

    private fun download(url: String) {
        if (busy) { toast("Já tem um download em andamento"); return }
        busy = true
        hideKeyboard()
        setBusyUi(true)
        status.text = "Buscando o vídeo..."
        progress.isIndeterminate = true

        io.execute {
            val job = File(cacheDir, "dl/" + System.currentTimeMillis())
            job.mkdirs()
            try {
                val req = YoutubeDLRequest(url)
                req.addOption("-o", job.absolutePath + "/%(uploader,extractor)s_%(id)s.%(ext)s")
                req.addOption("-f", "bv*+ba/b")
                req.addOption("--merge-output-format", "mp4")
                req.addOption("--restrict-filenames")
                req.addOption("--no-mtime")
                req.addOption("--no-part")
                val cookies = cookieFile(this)
                if (isInstagram(url) && cookies.exists()) req.addOption("--cookies", cookies.absolutePath)

                YoutubeDL.getInstance().execute(req, JOB_ID) { p, _, _ ->
                    ui.post {
                        if (p > 0f) {
                            progress.isIndeterminate = false
                            progress.progress = p.toInt()
                            status.text = "Baixando... ${p.toInt()}%"
                        }
                    }
                }

                val files = job.listFiles()?.filter { it.isFile && it.length() > 0 }?.sortedBy { it.name } ?: emptyList()
                if (files.isEmpty()) throw Exception("nenhum arquivo foi baixado")

                ui.post { status.text = "Salvando na galeria..."; progress.isIndeterminate = true }
                val saved = files.map { f -> f to saveToGallery(f) }
                ui.post {
                    for ((f, uri) in saved) addHistory(f.name, uri, mimeOf(f))
                    status.text = if (saved.size == 1) "Pronto! Salvo na galeria, pasta Baixador."
                                  else "Pronto! ${saved.size} arquivos salvos na galeria, pasta Baixador."
                    urlField.setText("")
                }
            } catch (e: Throwable) {
                val msg = friendlyError(url, e)
                ui.post { status.text = msg }
            } finally {
                job.deleteRecursively()
                busy = false
                ui.post { setBusyUi(false) }
            }
        }
    }

    private fun friendlyError(url: String, e: Throwable): String {
        val raw = (e.message ?: e.toString())
        val m = raw.lowercase()
        return when {
            "canceled" in m || "cancelled" in m || e is InterruptedException -> "Download cancelado."
            "unsupported url" in m -> "Esse link não é reconhecido. Copie o link direto do vídeo."
            isInstagram(url) && !cookieFile(this).exists() &&
                ("login" in m || "cookies" in m || "private" in m || "rate-limit" in m || "story" in url) ->
                "Esse conteúdo do Instagram precisa de login. Toque em \"Entrar no Instagram\" mais abaixo e tente de novo."
            isInstagram(url) && ("login" in m || "cookies" in m) ->
                "O Instagram pediu login de novo. Toque em \"Sair do Instagram\", entre outra vez e tente."
            "private" in m -> "Esse vídeo é privado ou não está disponível para esta conta."
            "unable to resolve" in m || "network" in m || "timed out" in m || "connection" in m ->
                "Sem conexão com a internet ou o site não respondeu. Tente de novo."
            else -> "Não consegui baixar. Toque em Atualizar motor e tente de novo.\n\nDetalhe: " + raw.trim().takeLast(220)
        }
    }

    private fun setBusyUi(b: Boolean) {
        btnDownload.isEnabled = !b
        btnCancel.visibility = if (b) View.VISIBLE else View.GONE
        progress.visibility = if (b) View.VISIBLE else View.GONE
    }

    /* ---------------- galeria ---------------- */

    private fun mimeOf(f: File): String = when (f.extension.lowercase()) {
        "mp4", "m4v" -> "video/mp4"
        "webm" -> "video/webm"
        "mov" -> "video/quicktime"
        "jpg", "jpeg" -> "image/jpeg"
        "png" -> "image/png"
        "webp" -> "image/webp"
        "heic" -> "image/heic"
        "m4a" -> "audio/mp4"
        "mp3" -> "audio/mpeg"
        else -> "video/mp4"
    }

    /** roda na thread de trabalho; devolve o endereço do arquivo na galeria */
    private fun saveToGallery(f: File): String {
        val mime = mimeOf(f)
        val isImage = mime.startsWith("image/")
        if (Build.VERSION.SDK_INT >= 29) {
            val collection = if (isImage) MediaStore.Images.Media.EXTERNAL_CONTENT_URI else MediaStore.Video.Media.EXTERNAL_CONTENT_URI
            val folder = (if (isImage) Environment.DIRECTORY_PICTURES else Environment.DIRECTORY_MOVIES) + "/Baixador"
            val cv = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, f.name)
                put(MediaStore.MediaColumns.MIME_TYPE, mime)
                put(MediaStore.MediaColumns.RELATIVE_PATH, folder)
                put(MediaStore.MediaColumns.IS_PENDING, 1)
            }
            val uri = contentResolver.insert(collection, cv) ?: throw Exception("a galeria recusou o arquivo")
            contentResolver.openOutputStream(uri).use { out ->
                if (out == null) throw Exception("não foi possível gravar na galeria")
                FileInputStream(f).use { it.copyTo(out) }
            }
            cv.clear()
            cv.put(MediaStore.MediaColumns.IS_PENDING, 0)
            contentResolver.update(uri, cv, null, null)
            return uri.toString()
        } else {
            val base = Environment.getExternalStoragePublicDirectory(if (isImage) Environment.DIRECTORY_PICTURES else Environment.DIRECTORY_MOVIES)
            val dir = File(base, "Baixador").apply { mkdirs() }
            val dst = File(dir, f.name)
            FileInputStream(f).use { input -> FileOutputStream(dst).use { input.copyTo(it) } }
            var result = ""
            val latch = CountDownLatch(1)
            MediaScannerConnection.scanFile(this, arrayOf(dst.absolutePath), arrayOf(mime)) { _, uri ->
                result = uri?.toString() ?: ""
                latch.countDown()
            }
            latch.await(10, TimeUnit.SECONDS)
            return result
        }
    }

    private fun askStorageIfNeeded() {
        if (Build.VERSION.SDK_INT < 29 &&
            checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.WRITE_EXTERNAL_STORAGE), REQ_STORAGE)
        }
    }

    /* ---------------- histórico ---------------- */

    private fun loadHistory(): JSONArray = try { JSONArray(prefs.getString("history", "[]")) } catch (e: Exception) { JSONArray() }

    private fun addHistory(name: String, uri: String, mime: String) {
        val old = loadHistory()
        val arr = JSONArray()
        arr.put(JSONObject().put("name", name).put("uri", uri).put("mime", mime).put("t", System.currentTimeMillis()))
        for (i in 0 until minOf(old.length(), 19)) arr.put(old.get(i))
        prefs.edit().putString("history", arr.toString()).apply()
        renderHistory()
    }

    private fun renderHistory() {
        history.removeAllViews()
        val arr = loadHistory()
        if (arr.length() == 0) {
            history.addView(TextView(this).apply {
                text = "Nada baixado ainda."
                setTextColor(0xFF71717A.toInt())
                textSize = 14f
            })
            return
        }
        val dp = resources.displayMetrics.density
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            val uriStr = o.optString("uri")
            val mime = o.optString("mime", "video/mp4")
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(0, (6 * dp).toInt(), 0, (6 * dp).toInt())
            }
            row.addView(TextView(this).apply {
                text = o.optString("name")
                setTextColor(0xFFD4D4D8.toInt())
                textSize = 13f
                maxLines = 2
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            })
            if (uriStr.isNotEmpty()) {
                val uri = Uri.parse(uriStr)
                row.addView(Button(this).apply {
                    text = "Abrir"
                    setOnClickListener { openUri(uri, mime) }
                })
                row.addView(Button(this).apply {
                    text = "Enviar"
                    setOnClickListener { shareUri(uri, mime) }
                })
            }
            history.addView(row)
        }
    }

    private fun openUri(uri: Uri, mime: String) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri, mime).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION))
        } catch (e: Exception) { toast("Não encontrei o arquivo. Ele pode ter sido apagado da galeria.") }
    }

    private fun shareUri(uri: Uri, mime: String) {
        try {
            val i = Intent(Intent.ACTION_SEND).setType(mime).putExtra(Intent.EXTRA_STREAM, uri)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            startActivity(Intent.createChooser(i, "Enviar para"))
        } catch (e: Exception) { toast("Não consegui compartilhar esse arquivo") }
    }

    /* ---------------- login do Instagram ---------------- */

    private fun refreshInstagramState() {
        if (cookieFile(this).exists()) {
            igStatus.text = "Conectado. Os stories que a sua conta consegue ver podem ser baixados."
            btnLogin.text = "Sair do Instagram"
        } else {
            igStatus.text = "Para baixar stories, entre uma vez na sua conta do Instagram. A senha é digitada na própria página do Instagram e fica só neste celular. Dica: use uma conta secundária."
            btnLogin.text = "Entrar no Instagram"
        }
    }

    private fun logoutInstagram() {
        cookieFile(this).delete()
        CookieManager.getInstance().removeAllCookies(null)
        CookieManager.getInstance().flush()
        refreshInstagramState()
        toast("Instagram desconectado")
    }

    /* ---------------- utilidades ---------------- */

    private fun hideKeyboard() {
        (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager).hideSoftInputFromWindow(urlField.windowToken, 0)
    }

    private fun toast(m: String) = Toast.makeText(this, m, Toast.LENGTH_LONG).show()
}
