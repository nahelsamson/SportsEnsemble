package fr.sportsensemble.agenda;

import java.net.URL;
import java.net.URLConnection;
import java.net.URLStreamHandler;
import javax.net.ssl.HttpsURLConnection;
import java.security.cert.Certificate;

/** Standalone client contract checks, without credentials or a live Android device. */
public final class ApiContractCheck {
    private static FakeConnection last;
    private static final class FakeConnection extends HttpsURLConnection {
        FakeConnection(URL url) { super(url); }
        @Override public void connect() { }
        @Override public void disconnect() { }
        @Override public boolean usingProxy() { return false; }
        @Override public int getResponseCode() { return 302; }
        @Override public String getCipherSuite() { return "test"; }
        @Override public Certificate[] getLocalCertificates() { return null; }
        @Override public Certificate[] getServerCertificates() { return new Certificate[0]; }
    }
    private static void check(boolean value, String reason) {
        if (!value) throw new AssertionError(reason);
    }
    public static void main(String[] args) throws Exception {
        String render = "https://sportsensemble-api.onrender.com";
        check(Api.origin(render + "/").equals(render), "origin normalization");
        for (String invalid : new String[]{"http://example.com", "https://user:pass@example.com", "https://example.com/path", "https://example.com?q=a", "https://example.com#x", "https://example.com:0", "https://example.com:99999"}) {
            boolean rejected = false; try { Api.origin(invalid); } catch (Exception expected) { rejected = true; }
            check(rejected, "reject non-origin URL");
        }
        check(Api.isTemporaryServer("https://legacy-sports.trycloudflare.com"), "old tunnel recognized");
        check(!Api.isTemporaryServer(render), "stable host retained");
        check(!Api.isTemporaryServer("https://trycloudflare.com.evil.invalid"), "host suffix boundary");
        URL.setURLStreamHandlerFactory(protocol -> !protocol.equals("https") ? null : new URLStreamHandler() {
            @Override protected URLConnection openConnection(URL url) { last = new FakeConnection(url); return last; }
        });
        String cookie = "sportsensemble_session=" + "a".repeat(64);
        try { Api.call(render, "/api/auth/mobile-agenda", null, cookie); throw new AssertionError("redirect accepted"); }
        catch (Api.Failure expected) { check(expected.status == 302, "redirect refused before processing response"); }
        check(render.equals(last.getRequestProperty("Origin")), "Render origin");
        check(cookie.equals(last.getRequestProperty("Cookie")), "native session attached");
        check(!last.getInstanceFollowRedirects(), "credentials never follow redirect");
        check(last.getReadTimeout() >= 90000, "allow free server wake-up");
        try { Api.call("https://old.trycloudflare.com", "/api/auth/mobile-agenda", null, "bad-cookie"); }
        catch (Api.Failure expected) { check(expected.status == 302, "legacy redirect refused"); }
        check(Api.ORIGIN.equals(last.getRequestProperty("Origin")), "legacy gateway compatibility");
        check(last.getRequestProperty("Cookie") == null, "reject invalid session");
        System.out.println("Android API: HTTPS, migration, cookies, timeout and redirect checks passed.");
    }
}
