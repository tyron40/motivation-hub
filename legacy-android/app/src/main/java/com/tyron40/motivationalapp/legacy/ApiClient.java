package com.tyron40.motivationalapp.legacy;

import android.content.Context;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.KeyStore;
import java.security.cert.Certificate;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.List;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.TrustManagerFactory;
import javax.net.ssl.X509TrustManager;

final class ApiClient {
    static final String BASE_URL = "https://motivation-hub-iota.vercel.app";

    interface Callback<T> {
        void success(T value);
        void failure(String message);
    }

    private ApiClient() {}

    static List<Speech> getSpeeches(Context context, String endpoint, JSONObject body) throws Exception {
        JSONObject response = post(context, endpoint, body);
        JSONArray videos = response.optJSONArray("videos");
        List<Speech> result = new ArrayList<Speech>();
        if (videos != null) {
            for (int i = 0; i < videos.length(); i++) {
                JSONObject video = videos.optJSONObject(i);
                if (video != null && video.optString("id").length() > 0) {
                    result.add(Speech.fromJson(video));
                }
            }
        }
        return result;
    }

    static String chat(Context context, String prompt) throws Exception {
        JSONArray messages = new JSONArray();
        messages.put(new JSONObject()
            .put("role", "system")
            .put("content", "You are the Motivation Fuel coach. Be encouraging, practical, concise, and safe."));
        messages.put(new JSONObject().put("role", "user").put("content", prompt));
        JSONObject response = post(context, "/api/chat", new JSONObject().put("messages", messages));
        String message = response.optString("message");
        if (message.length() == 0) throw new Exception("The coach returned an empty response.");
        return message;
    }

    private static JSONObject post(Context context, String endpoint, JSONObject body) throws Exception {
        URL url = new URL(BASE_URL + endpoint);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        if (connection instanceof HttpsURLConnection && Build.VERSION.SDK_INT <= 20) {
            SSLContext sslContext = SSLContext.getInstance("TLSv1.2");
            sslContext.init(null, new TrustManager[] { legacyTrustManager(context) }, null);
            ((HttpsURLConnection) connection).setSSLSocketFactory(
                new Tls12SocketFactory(sslContext.getSocketFactory())
            );
        }
        connection.setConnectTimeout(20000);
        connection.setReadTimeout(60000);
        connection.setRequestMethod("POST");
        connection.setDoOutput(true);
        connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("User-Agent", "MotivationFuelLegacy/1.1.14 Android/" + Build.VERSION.SDK_INT);

        byte[] payload = body.toString().getBytes("UTF-8");
        connection.setFixedLengthStreamingMode(payload.length);
        OutputStream output = connection.getOutputStream();
        output.write(payload);
        output.flush();
        output.close();

        int status = connection.getResponseCode();
        InputStream stream = status >= 200 && status < 300
            ? connection.getInputStream()
            : connection.getErrorStream();
        String text = read(stream);
        connection.disconnect();
        if (status < 200 || status >= 300) {
            throw new Exception("Server error " + status + (text.length() > 0 ? ": " + text : ""));
        }
        return new JSONObject(text);
    }

    private static X509TrustManager legacyTrustManager(Context context) throws Exception {
        TrustManagerFactory systemFactory = TrustManagerFactory.getInstance(
            TrustManagerFactory.getDefaultAlgorithm()
        );
        systemFactory.init((KeyStore) null);
        final X509TrustManager system = findX509(systemFactory.getTrustManagers());

        CertificateFactory certificateFactory = CertificateFactory.getInstance("X.509");
        InputStream input = context.getResources().openRawResource(R.raw.isrg_root_x1);
        Certificate certificate;
        try {
            certificate = certificateFactory.generateCertificate(input);
        } finally {
            input.close();
        }

        KeyStore anchors = KeyStore.getInstance(KeyStore.getDefaultType());
        anchors.load(null, null);
        anchors.setCertificateEntry("isrg-root-x1", certificate);
        TrustManagerFactory fallbackFactory = TrustManagerFactory.getInstance(
            TrustManagerFactory.getDefaultAlgorithm()
        );
        fallbackFactory.init(anchors);
        final X509TrustManager fallback = findX509(fallbackFactory.getTrustManagers());

        return new X509TrustManager() {
            @Override public X509Certificate[] getAcceptedIssuers() {
                X509Certificate[] first = system.getAcceptedIssuers();
                X509Certificate[] second = fallback.getAcceptedIssuers();
                X509Certificate[] combined = new X509Certificate[first.length + second.length];
                System.arraycopy(first, 0, combined, 0, first.length);
                System.arraycopy(second, 0, combined, first.length, second.length);
                return combined;
            }

            @Override public void checkClientTrusted(X509Certificate[] chain, String authType)
                throws CertificateException {
                system.checkClientTrusted(chain, authType);
            }

            @Override public void checkServerTrusted(X509Certificate[] chain, String authType)
                throws CertificateException {
                try {
                    system.checkServerTrusted(chain, authType);
                } catch (CertificateException ignored) {
                    fallback.checkServerTrusted(chain, authType);
                }
            }
        };
    }

    private static X509TrustManager findX509(TrustManager[] managers) throws Exception {
        for (TrustManager manager : managers) {
            if (manager instanceof X509TrustManager) return (X509TrustManager) manager;
        }
        throw new Exception("No X.509 trust manager is available.");
    }

    private static String read(InputStream stream) throws Exception {
        if (stream == null) return "";
        BufferedReader reader = new BufferedReader(new InputStreamReader(stream, "UTF-8"));
        StringBuilder result = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) result.append(line);
        reader.close();
        return result.toString();
    }
}
