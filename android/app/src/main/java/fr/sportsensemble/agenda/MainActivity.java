package fr.sportsensemble.agenda;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.EditText;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import org.json.JSONObject;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
    private static final int INK = Color.rgb(21,46,54), GREEN = Color.rgb(23,107,89), LIME = Color.rgb(215,241,122);
    private static final int PAPER = Color.rgb(245,247,243), MUTED = Color.rgb(87,110,112), LINE = Color.rgb(222,230,221);
    private static final String[] DAYS = {"Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"};
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("d MMMM", Locale.FRANCE);
    private final ExecutorService network = Executors.newSingleThreadExecutor();
    private SecureStore store;
    private String base = "", cookie = "", status = "";
    private Agenda agenda;
    private ReviewsPanel reviews;
    private long cachedAt, lastAttempt;
    private int generation, selectedDay = LocalDate.now(java.time.ZoneId.of("Europe/Paris")).getDayOfWeek().getValue() - 1, weekOffset;
    private boolean busy, allWeek;
    private String tab = "week";
    private LinearLayout root, content;

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        store = new SecureStore(this);
        reviews = new ReviewsPanel(this, network, saved);
        try {
            JSONObject state = store.load();
            base = state.optString("base", getString(R.string.default_server_url)); cookie = state.optString("cookie"); cachedAt = state.optLong("cachedAt");
            if (state.has("snapshot")) agenda = new Agenda(state.getJSONObject("snapshot"));
            if (agenda != null) status = "Dernière copie enregistrée sur ce téléphone";
        } catch (Exception error) { store.clear(); base = getString(R.string.default_server_url); cookie = ""; agenda = null; cachedAt = 0; status = "La copie locale n’est plus lisible. Reconnecte-toi."; }
        if (Api.isTemporaryServer(base) && !Api.isTemporaryServer(getString(R.string.default_server_url))) {
            // Never forward an old session or cached account to the new host.
            store.clear(); base = getString(R.string.default_server_url); cookie = ""; agenda = null; cachedAt = 0;
            status = "L’application utilise maintenant le serveur en ligne. Reconnecte-toi.";
            persist();
        }
        if (saved != null) { selectedDay = saved.getInt("day", selectedDay); weekOffset = saved.getInt("week"); allWeek = saved.getBoolean("all"); tab = saved.getString("tab", "week"); }
        render();
    }
    @Override public void onResume() {
        super.onResume();
        if (!cookie.isEmpty() && !busy && System.currentTimeMillis() - lastAttempt > 60000) refresh();
    }
    @Override public void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out); out.putInt("day", selectedDay); out.putInt("week", weekOffset); out.putBoolean("all", allWeek); out.putString("tab", tab); reviews.save(out);
    }
    @Override public void onDestroy() { generation++; reviews.close(); network.shutdownNow(); super.onDestroy(); }
    private int dp(float n) { return Math.round(n * getResources().getDisplayMetrics().density); }
    private LinearLayout column() { LinearLayout x = new LinearLayout(this); x.setOrientation(LinearLayout.VERTICAL); return x; }
    private LinearLayout row() { LinearLayout x = new LinearLayout(this); x.setOrientation(LinearLayout.HORIZONTAL); x.setGravity(Gravity.CENTER_VERTICAL); return x; }
    private GradientDrawable shape(int color, int stroke) { GradientDrawable d = new GradientDrawable(); d.setColor(color); d.setCornerRadius(dp(18)); if (stroke != 0) d.setStroke(dp(1), stroke); return d; }
    private TextView text(String value, float size, int color, boolean bold) {
        TextView t = new TextView(this); t.setText(value); t.setTextSize(size); t.setTextColor(color); t.setLineSpacing(dp(3), 1);
        if (bold) t.setTypeface(Typeface.DEFAULT, Typeface.BOLD); return t;
    }
    private void addText(LinearLayout parent, String value, float size, int color, boolean bold) { parent.addView(text(value, size, color, bold)); }
    private void gap(LinearLayout parent, int height) { View v = new View(this); parent.addView(v, new LinearLayout.LayoutParams(1, dp(height))); }
    private Button button(String label, boolean primary, Runnable action) {
        Button b = new Button(this); b.setText(label); b.setAllCaps(false); b.setTextSize(14); b.setMinHeight(dp(48)); b.setMinimumHeight(dp(48));
        b.setPadding(dp(12), dp(6), dp(12), dp(6)); b.setTextColor(primary ? Color.WHITE : INK);
        b.setBackground(shape(primary ? GREEN : Color.WHITE, primary ? 0 : LINE));
        b.setEnabled(!busy); b.setAlpha(busy ? .5f : 1f); b.setOnClickListener(v -> action.run()); return b;
    }
    private void fullButton(LinearLayout parent, String label, boolean primary, Runnable action) {
        gap(parent, 12); parent.addView(button(label, primary, action), new LinearLayout.LayoutParams(-1, -2));
    }
    private LinearLayout card(LinearLayout parent) {
        LinearLayout box = column(); box.setPadding(dp(18), dp(18), dp(18), dp(18)); box.setBackground(shape(Color.WHITE, LINE));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2); params.bottomMargin = dp(12); parent.addView(box, params); return box;
    }
    private void heading(String title, String subtitle) { addText(content, title, 29, INK, true); gap(content, 5); addText(content, subtitle, 15, MUTED, false); gap(content, 22); }
    private String stamp() { return cachedAt == 0 ? "Jamais actualisé" : java.text.DateFormat.getDateTimeInstance(java.text.DateFormat.SHORT, java.text.DateFormat.SHORT, Locale.FRANCE).format(new Date(cachedAt)); }
    private void render() {
        root = column(); root.setBackgroundColor(PAPER);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) { android.graphics.Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime()); v.setPadding(i.left, i.top, i.right, i.bottom); }
            else v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        LinearLayout header = row(); header.setPadding(dp(20), dp(14), dp(20), dp(10));
        TextView logo = text("S", 24, INK, true); logo.setGravity(Gravity.CENTER); logo.setBackground(shape(LIME, 0)); header.addView(logo, new LinearLayout.LayoutParams(dp(42), dp(42)));
        LinearLayout brand = column(); brand.setPadding(dp(12), 0, 0, 0); addText(brand, "SPORTS ENSEMBLE", 14, INK, true); addText(brand, "Mon agenda · Pays d’Aix", 12, MUTED, false); header.addView(brand, new LinearLayout.LayoutParams(0, -2, 1));
        if (agenda != null) header.addView(button("Compte", false, () -> { tab = "account"; render(); }));
        root.addView(header);
        ScrollView scroll = new ScrollView(this); scroll.setFillViewport(true);
        content = column(); content.setPadding(dp(20), dp(18), dp(20), dp(28)); scroll.addView(content); root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        if (agenda == null) loginScreen();
        else {
            if (!status.isEmpty() && !tab.equals("reviews")) { TextView banner = text(status + "\nCopie du " + stamp(), 12, GREEN, false); banner.setPadding(dp(12), dp(10), dp(12), dp(10)); banner.setBackground(shape(Color.rgb(232,240,225), 0)); content.addView(banner); gap(content, 18); }
            if (tab.equals("reviews")) reviews.show(content, base, cookie, agenda.name); else if (tab.equals("clubs")) clubsScreen(); else if (tab.equals("account")) accountScreen(); else weekScreen();
            LinearLayout nav = row(); nav.setPadding(dp(16), dp(10), dp(16), dp(10)); nav.setBackgroundColor(Color.WHITE);
            Button week = button("Ma semaine", tab.equals("week"), () -> { tab = "week"; render(); });
            Button clubs = button("Mes sports", tab.equals("clubs"), () -> { tab = "clubs"; render(); });
            LinearLayout.LayoutParams left = new LinearLayout.LayoutParams(0, -2, 1); left.rightMargin = dp(8); nav.addView(week, left); nav.addView(clubs, left); nav.addView(button("Avis", tab.equals("reviews"), () -> { tab = "reviews"; render(); }), new LinearLayout.LayoutParams(0, -2, 1)); root.addView(nav);
        }
        setContentView(root); root.requestApplyInsets();
    }
    private EditText field(String title, String hint, int input, String value) {
        addText(content, title, 14, INK, true); gap(content, 6);
        EditText e = new EditText(this); e.setHint(hint); e.setText(value); e.setTextSize(16); e.setTextColor(INK); e.setHintTextColor(MUTED); e.setInputType(input); e.setSingleLine(true); e.setSaveEnabled(false);
        e.setPadding(dp(14), dp(10), dp(14), dp(10)); e.setMinHeight(dp(54)); e.setBackground(shape(Color.WHITE, LINE)); content.addView(e, new LinearLayout.LayoutParams(-1, -2)); gap(content, 18); return e;
    }
    private void loginScreen() {
        heading("Ton sport,\nà portée de main.", "Retrouve les séances et les clubs choisis sur ton compte SportsEnsemble.");
        if (!status.isEmpty()) { addText(content, status, 14, GREEN, false); gap(content, 16); }
        EditText server = base.equals(getString(R.string.default_server_url)) ? null
            : field("Adresse du serveur", "https://agenda…", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI, base);
        EditText email = field("E-mail du compte", "toi@exemple.fr", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS, "");
        EditText password = field("Mot de passe", "Ton mot de passe habituel", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD, "");
        email.setAutofillHints(View.AUTOFILL_HINT_USERNAME); password.setAutofillHints(View.AUTOFILL_HINT_PASSWORD);
        fullButton(content, busy ? "Connexion en cours…" : "Se connecter", true, () -> {
            String address, login = email.getText().toString().trim(), secret = password.getText().toString();
            try { address = Api.origin(server == null ? base : server.getText().toString()); }
            catch (Exception error) { if (server != null) server.setError("Une adresse HTTPS complète est nécessaire"); else toast("Adresse du serveur indisponible."); return; }
            if (login.isEmpty()) { email.setError("Indique ton e-mail"); return; }
            if (secret.isEmpty()) { password.setError("Indique ton mot de passe"); return; }
            password.setText(""); login(address, login, secret);
        });
        gap(content, 20); addText(content, "Le compte se crée sur le site. Après une première connexion, ton planning reste lisible sans réseau. Les changements se font dans Agenda et Ma semaine sur le site.", 13, MUTED, false);
    }
    private LocalDate monday() { LocalDate now = LocalDate.now(java.time.ZoneId.of("Europe/Paris")); return now.minusDays(now.getDayOfWeek().getValue() - 1).plusWeeks(weekOffset); }
    private void weekScreen() {
        heading("Ma semaine", "Bonjour " + agenda.name + ", voici ton programme.");
        LinearLayout summary = card(content); summary.setBackground(shape(INK, 0));
        addText(summary, agenda.sessions.size() + " séance" + (agenda.sessions.size() > 1 ? "s" : "") + " dans ta semaine", 22, Color.WHITE, true);
        int minutes = agenda.minutes(); gap(summary, 6); addText(summary, (minutes / 60) + " h " + (minutes % 60 == 0 ? "" : minutes % 60 + " min") + " de sport · semaine type", 14, LIME, false);
        final LocalDate monday = monday();
        LinearLayout dates = row();
        dates.addView(button("‹", false, () -> { weekOffset--; render(); }));
        TextView range = text(monday.format(DATE) + "\nau " + monday.plusDays(6).format(DATE), 15, INK, true); range.setGravity(Gravity.CENTER); dates.addView(range, new LinearLayout.LayoutParams(0, -2, 1));
        dates.addView(button("›", false, () -> { weekOffset++; render(); })); content.addView(dates); gap(content, 16);
        HorizontalScrollView days = new HorizontalScrollView(this); days.setHorizontalScrollBarEnabled(false); LinearLayout strip = row();
        for (int day = 0; day < 7; day++) {
            final int chosen = day; LocalDate date = monday.plusDays(day);
            Button b = button(DAYS[day].substring(0, 3) + "\n" + date.getDayOfMonth() + (agenda.onDay(day).isEmpty() ? "" : " ·"), selectedDay == day && !allWeek, () -> { selectedDay = chosen; allWeek = false; render(); });
            b.setTextSize(12); b.setPadding(dp(6), dp(10), dp(6), dp(10)); b.setMinWidth(0); b.setMinimumWidth(0); b.setContentDescription(DAYS[day] + " " + date.format(DATE) + ", " + agenda.onDay(day).size() + " séances");
            LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(dp(57), dp(66)); p.rightMargin = dp(6); strip.addView(b, p);
        }
        days.addView(strip); content.addView(days); days.post(() -> days.scrollTo(Math.max(0, dp(selectedDay * 63 - 125)), 0));
        LinearLayout controls = row();
        controls.addView(button(allWeek ? "Voir un jour" : "Toute la semaine", false, () -> { allWeek = !allWeek; render(); }), new LinearLayout.LayoutParams(0, -2, 1));
        controls.addView(button("Aujourd’hui", false, () -> { weekOffset = 0; selectedDay = LocalDate.now(java.time.ZoneId.of("Europe/Paris")).getDayOfWeek().getValue() - 1; allWeek = false; render(); }), new LinearLayout.LayoutParams(0, -2, 1)); gap(content, 12); content.addView(controls); gap(content, 22);
        for (int day = 0; day < 7; day++) {
            if (!allWeek && day != selectedDay) continue;
            addText(content, DAYS[day] + " " + monday.plusDays(day).format(DATE), 20, INK, true); gap(content, 12);
            if (agenda.onDay(day).isEmpty()) { LinearLayout empty = card(content); addText(empty, "Pas de séance prévue", 16, INK, true); addText(empty, "Une pause dans ta semaine sportive.", 14, MUTED, false); }
            for (JSONObject slot : agenda.onDay(day)) sessionCard(slot);
        }
        if (agenda.sessions.isEmpty()) addText(content, "Choisis d’abord tes créneaux dans Ma semaine sur le site, puis actualise ici.", 14, MUTED, false);
        gap(content, 10); addText(content, "Horaires d’Aix-en-Provence. Semaine type : les congés, annulations et changements du club ne sont pas connus automatiquement. Ce planning n’est pas une réservation.", 12, MUTED, false);
        fullButton(content, busy ? "Actualisation…" : "Actualiser mon planning", true, this::refresh);
    }
    private void sessionCard(JSONObject slot) {
        JSONObject club = agenda.club(slot); LinearLayout box = card(content);
        addText(box, Agenda.hours(slot), 22, GREEN, true); gap(box, 8);
        addText(box, club == null ? "Club indisponible" : club.optString("sport"), 13, MUTED, true);
        addText(box, club == null ? slot.optString("clubId") : club.optString("name"), 18, INK, true);
        if (club != null) { gap(box, 8); addText(box, club.optString("address", "Adresse non communiquée"), 14, MUTED, false);
            fullButton(box, "Détails et itinéraire", false, () -> details(club, Agenda.hours(slot)));
        }
    }
    private void clubsScreen() {
        heading("Mes sports", "Les clubs que tu as sélectionnés dans ton agenda."); int count = 0;
        for (JSONObject club : agenda.clubs.values()) {
            if (!club.optBoolean("selected")) continue; count++;
            LinearLayout box = card(content); addText(box, club.optString("sport"), 13, GREEN, true); gap(box, 6); addText(box, club.optString("name"), 19, INK, true);
            gap(box, 10); addText(box, club.optString("address", "Adresse non communiquée"), 14, MUTED, false);
            fullButton(box, "Horaires, prix et itinéraire", false, () -> details(club, ""));
        }
        if (count == 0) { LinearLayout empty = card(content); addText(empty, "Aucun club sélectionné", 18, INK, true); gap(empty, 8); addText(empty, "Ajoute tes clubs dans l’onglet Agenda sur le site, puis actualise l’application.", 14, MUTED, false); }
        fullButton(content, busy ? "Actualisation…" : "Actualiser mes sports", true, this::refresh);
    }
    private void details(JSONObject club, String hours) {
        ScrollView scroll = new ScrollView(this); LinearLayout body = column(); body.setPadding(dp(22), dp(14), dp(22), dp(16)); scroll.addView(body);
        if (!hours.isEmpty()) { addText(body, hours, 22, GREEN, true); gap(body, 12); }
        String[][] values = {{"Sport", "sport"}, {"Adresse", "address"}, {"Tarif indiqué", "price"}, {"Public", "audience"}, {"Horaires indiqués par le club", "hours"}};
        for (String[] value : values) { addText(body, value[0], 13, GREEN, true); gap(body, 4); addText(body, club.optString(value[1], "Non communiqué"), 15, INK, false); gap(body, 16); }
        addText(body, "Les horaires et tarifs proviennent du référencement du site. Confirme leur actualité auprès du club.", 12, MUTED, false);
        AlertDialog.Builder dialog = new AlertDialog.Builder(this).setTitle(club.optString("name")).setView(scroll).setNegativeButton("Fermer", null);
        if (!club.optString("directions").isEmpty()) dialog.setPositiveButton("Itinéraire", (d, w) -> openMaps(club.optString("directions")));
        dialog.show();
    }
    private void openMaps(String url) {
        Uri uri = Uri.parse(url);
        if (!"https".equals(uri.getScheme()) || !"www.google.com".equals(uri.getHost()) || !"/maps/dir/".equals(uri.getPath())) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (android.content.ActivityNotFoundException error) { toast("Installe un navigateur ou une application de cartes."); }
    }
    private void accountScreen() {
        heading("Mon compte", agenda.name);
        LinearLayout box = card(content); addText(box, "Dernière actualisation", 14, GREEN, true); addText(box, stamp(), 18, INK, true); gap(box, 16);
        addText(box, "Serveur", 14, GREEN, true); addText(box, base, 14, INK, false); gap(box, 16);
        addText(box, "Ton planning est enregistré de façon chiffrée sur ce téléphone. Le mot de passe n’est pas conservé. La déconnexion efface cette copie.", 14, MUTED, false);
        fullButton(content, busy ? "Actualisation…" : "Actualiser", true, this::refresh);
        fullButton(content, "Changer d’adresse de serveur", false, () -> new AlertDialog.Builder(this).setTitle("Changer de serveur ?").setMessage("Tu devras te reconnecter. La copie locale sera effacée pour éviter de mélanger deux comptes ou deux serveurs.").setNegativeButton("Annuler", null).setPositiveButton("Continuer", (d, w) -> logout(true)).show());
        fullButton(content, "Se déconnecter", false, () -> new AlertDialog.Builder(this).setTitle("Se déconnecter ?").setMessage("Le planning enregistré sur ce téléphone sera effacé.").setNegativeButton("Annuler", null).setPositiveButton("Déconnexion", (d, w) -> logout(false)).show());
        gap(content, 24); addText(content, "SportsEnsemble Agenda · 0.3.0\nConsultation de ton agenda personnel. Sans réseau, tu consultes la dernière copie enregistrée. Après une période d’inactivité, la connexion peut prendre environ une minute.", 12, MUTED, false);
    }
    private void persist() {
        try { JSONObject state = new JSONObject().put("base", base).put("cookie", cookie).put("cachedAt", cachedAt); if (agenda != null) state.put("snapshot", agenda.raw); store.save(state); }
        catch (Exception error) { store.clear(); status = "Planning chargé, mais copie hors connexion indisponible"; toast(status); }
    }
    private void login(String address, String email, String password) {
        if (busy) return; busy = true; base = address; status = "Connexion en cours… Le premier accès peut prendre environ une minute."; int request = ++generation; render();
        network.execute(() -> {
            String session = null;
            try {
                JSONObject body = new JSONObject().put("email", email).put("password", password);
                Api.Reply reply = Api.call(address, "/api/auth/login", body, ""); session = reply.cookie;
                if (session == null) throw new Exception("Session absente");
                Agenda result = new Agenda(Api.call(address, "/api/auth/mobile-agenda", null, session).data);
                final String token = session;
                runOnUiThread(() -> { if (request != generation || isFinishing()) return; cookie = token; agenda = result; cachedAt = System.currentTimeMillis(); lastAttempt = cachedAt; busy = false; status = "Planning à jour"; tab = "week"; persist(); render(); });
            } catch (Exception error) {
                if (session != null) try { Api.call(address, "/api/auth/logout", new JSONObject(), session); } catch (Exception ignored) { }
                runOnUiThread(() -> { if (request != generation || isFinishing()) return; busy = false; status = message(error); render(); });
            }
        });
    }
    private void refresh() {
        if (busy || cookie.isEmpty()) return; busy = true; lastAttempt = System.currentTimeMillis(); final int request = ++generation; final String address = base, token = cookie; status = "Actualisation en cours…"; render();
        network.execute(() -> {
            try {
                Agenda result = new Agenda(Api.call(address, "/api/auth/mobile-agenda", null, token).data);
                runOnUiThread(() -> { if (request != generation || isFinishing()) return; agenda = result; cachedAt = System.currentTimeMillis(); busy = false; status = "Planning à jour"; persist(); render(); });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    if (request != generation || isFinishing()) return; busy = false;
                    if (error instanceof Api.Failure && ((Api.Failure) error).status == 401) { cookie = ""; agenda = null; cachedAt = 0; store.clear(); reviews.close(); reviews = new ReviewsPanel(this, network, null); status = "Ta session a expiré. Reconnecte-toi."; }
                    else status = agenda == null ? message(error) : "Actualisation impossible · dernière copie disponible";
                    render();
                });
            }
        });
    }
    private void logout(boolean changeServer) {
        final String address = base, token = cookie; generation++; reviews.close(); reviews = new ReviewsPanel(this, network, null); cookie = ""; agenda = null; cachedAt = 0; status = "Déconnecté. La copie du planning a été effacée."; busy = false; store.clear(); if (changeServer) base = ""; tab = "week"; render();
        network.execute(() -> {
            try { Api.call(address, "/api/auth/logout", new JSONObject(), token); }
            catch (Exception error) { runOnUiThread(() -> { if (!isFinishing()) toast("Copie locale effacée. Sans connexion, la session distante expire automatiquement sous 7 jours."); }); }
        });
    }
    private String message(Exception error) { return error instanceof Api.Failure ? error.getMessage() : "Connexion impossible. Vérifie Internet, puis réessaie dans une minute : le serveur peut être en cours de réveil."; }
    private void toast(String message) { Toast.makeText(this, message, Toast.LENGTH_LONG).show(); }
}
