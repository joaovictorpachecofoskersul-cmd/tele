package br.com.acreditar.baixador

import android.app.Activity
import android.os.Bundle
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast

/**
 * Abre a página oficial de login do Instagram. A pessoa digita a própria senha
 * na página do Instagram; o app só guarda os cookies da sessão, neste celular,
 * para o motor de download conseguir ver os stories que essa conta vê.
 */
class LoginActivity : Activity() {

    private lateinit var web: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val dp = resources.displayMetrics.density

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(0xFF0E0E11.toInt())
        }
        root.addView(TextView(this).apply {
            text = "Entre na sua conta do Instagram. Depois que o feed aparecer, toque em \"Pronto, já entrei\"."
            setTextColor(0xFFD4D4D8.toInt())
            textSize = 14f
            setPadding((16 * dp).toInt(), (12 * dp).toInt(), (16 * dp).toInt(), (12 * dp).toInt())
        })

        web = WebView(this)
        root.addView(web, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))

        val done = Button(this).apply { text = "Pronto, já entrei" }
        root.addView(done, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        setContentView(root)

        val cm = CookieManager.getInstance()
        cm.setAcceptCookie(true)
        cm.setAcceptThirdPartyCookies(web, true)
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.webViewClient = WebViewClient()
        web.loadUrl("https://www.instagram.com/accounts/login/")

        done.setOnClickListener { saveSession() }
    }

    private fun saveSession() {
        val cm = CookieManager.getInstance()
        cm.flush()
        val raw = cm.getCookie("https://www.instagram.com") ?: ""
        if (!raw.contains("sessionid=")) {
            Toast.makeText(this, "Ainda não identifiquei o login. Termine de entrar e toque de novo.", Toast.LENGTH_LONG).show()
            return
        }
        val expiry = System.currentTimeMillis() / 1000 + 365L * 24 * 60 * 60
        val sb = StringBuilder("# Netscape HTTP Cookie File\n")
        for (part in raw.split(";")) {
            val p = part.trim()
            val eq = p.indexOf('=')
            if (eq <= 0) continue
            val name = p.substring(0, eq)
            val value = p.substring(eq + 1)
            sb.append(".instagram.com\tTRUE\t/\tTRUE\t").append(expiry).append('\t')
                .append(name).append('\t').append(value).append('\n')
        }
        MainActivity.cookieFile(this).writeText(sb.toString())
        setResult(RESULT_OK)
        finish()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (web.canGoBack()) web.goBack() else super.onBackPressed()
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }
}
