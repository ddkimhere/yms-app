package com.yms.mastertrack;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    public static final String EXTRA_PATH = "yms_path";
    private static final String BASE_URL = "https://ddkimhere.github.io/yms-app/";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost();
                String path = uri.getPath();
                if ("ddkimhere.github.io".equals(host) && path != null && path.startsWith("/yms-app/")) {
                    return false;
                }
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
                return true;
            }
        });

        loadRequestedPage(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        loadRequestedPage(intent);
    }

    private void loadRequestedPage(Intent intent) {
        String path = intent != null ? intent.getStringExtra(EXTRA_PATH) : null;
        if (path == null || path.isBlank()) path = "login.html";
        path = path.replace("..", "").replaceFirst("^/+", "");
        webView.loadUrl(BASE_URL + path);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
