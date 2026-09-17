package fr.sportsensemble.agenda;

import org.json.JSONObject;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.URL;
import javax.net.ssl.HttpsURLConnection;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

final class Api {
    static final String ORIGIN = "https://sportsensemble.android";
    static final class Failure extends Exception {
        final int status;
        Failure(int status, String message) { super(message); this.status = status; }
    }
    static final class Reply {
        final JSONObject data; final String cookie;
        Reply(JSONObject data, String cookie) { this.data = data; this.cookie = cookie; }
    }
    static String origin(String input) throws Exception {
        URI uri = new URI(input.trim());
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getHost().isEmpty()
            || uri.getUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null
            || (uri.getRawPath() != null && !uri.getRawPath().isEmpty() && !uri.getRawPath().equals("/"))
            || uri.getPort() == 0 || uri.getPort() > 65535)
            throw new Failure(0, "Indique l’adresse HTTPS du serveur, sans chemin ni identifiants.");
        return new URI("https", null, uri.getHost(), uri.getPort(), null, null, null).toASCIIString();
    }
    static boolean isTemporaryServer(String input) {
        try {
            String host = new URI(origin(input)).getHost().toLowerCase(java.util.Locale.ROOT);
            return host.endsWith(".trycloudflare.com");
        } catch (Exception ignored) { return false; }
    }
    static Reply call(String base, String endpoint, JSONObject body, String cookie) throws Exception {
        String safeBase = origin(base);
        if (!endpoint.matches("/(health|api/auth/(login|logout|mobile-agenda))")) throw new Failure(0, "Adresse invalide.");
        HttpsURLConnection connection = (HttpsURLConnection) new URL(safeBase + endpoint).openConnection();
        connection.setConnectTimeout(15000); connection.setReadTimeout(90000);
        // Never forward a session/password to a redirect, including another HTTPS host.
        connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("Accept", "application/json");
        // Native HTTPS requests use the site's cookie sessions; no browser third-party cookies.
        connection.setRequestProperty("Origin", isTemporaryServer(safeBase) ? ORIGIN : safeBase);
        connection.setRequestProperty("X-SportsEnsemble-Client", "android-v1");
        if (cookie != null && cookie.matches("sportsensemble_session=[a-f0-9]{64}")) connection.setRequestProperty("Cookie", cookie);
        try {
            if (body != null) {
                connection.setRequestMethod("POST"); connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                byte[] bytes = body.toString().getBytes(StandardCharsets.UTF_8);
                connection.setFixedLengthStreamingMode(bytes.length);
                try (java.io.OutputStream output = connection.getOutputStream()) { output.write(bytes); }
            }
            int code = connection.getResponseCode();
            if (code >= 300 && code < 400) throw new Failure(code, "L’adresse a changé. Mets à jour le serveur dans les réglages.");
            String type = connection.getContentType();
            if (type == null || !type.toLowerCase(java.util.Locale.ROOT).startsWith("application/json"))
                throw new Failure(code, "Ce serveur ne répond pas comme SportsEnsemble. Vérifie son adresse.");
            InputStream input = code >= 400 ? connection.getErrorStream() : connection.getInputStream();
            if (input == null) throw new Failure(code, "Le serveur est momentanément indisponible.");
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            try (InputStream stream = input) {
                byte[] chunk = new byte[4096]; int length;
                while ((length = stream.read(chunk)) != -1) {
                    if (output.size() + length > 1048576) throw new Failure(0, "Réponse du serveur trop volumineuse.");
                    output.write(chunk, 0, length);
                }
            }
            JSONObject data = new JSONObject(output.toString("UTF-8"));
            if (code < 200 || code >= 300) throw new Failure(code, data.optString("error", "Impossible de joindre le serveur."));
            String session = null;
            for (Map.Entry<String, List<String>> header : connection.getHeaderFields().entrySet()) {
                if (!"Set-Cookie".equalsIgnoreCase(header.getKey()) || header.getValue() == null) continue;
                for (String value : header.getValue()) {
                    String candidate = value.split(";", 2)[0].trim();
                    if (candidate.matches("sportsensemble_session=[a-f0-9]{64}")) session = candidate;
                }
            }
            return new Reply(data, session);
        } finally { connection.disconnect(); }
    }
}
