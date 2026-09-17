package fr.sportsensemble.agenda;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.Editable;
import android.text.InputFilter;
import android.text.InputType;
import android.text.TextWatcher;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Spinner;
import android.widget.TextView;
import org.json.JSONArray;
import org.json.JSONObject;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ExecutorService;

/** Public reviews are fetched separately from the private, offline agenda. */
final class ReviewsPanel {
    private static final int INK = Color.rgb(21,46,54), GREEN = Color.rgb(23,107,89), MUTED = Color.rgb(87,110,112);
    private final Activity activity;
    private final ExecutorService network;
    private final ArrayList<JSONObject> reviews = new ArrayList<>();
    private String base = "", cookie = "", cursor = "", draft = "", requestId = "", payloadKey = "", feedback = "", listMessage = "";
    private int rating = -1, total;
    private long fetchedAt;
    private boolean closed, loading, posting, loaded, reloadAfter;
    private LinearLayout parent, list;
    private TextView message, publication;
    private Button refreshButton, moreButton, publishButton;
    private Spinner scores;
    private EditText comment;

    ReviewsPanel(Activity activity, ExecutorService network, Bundle saved) {
        this.activity = activity; this.network = network;
        if (saved != null) {
            draft = saved.getString("reviewDraft", ""); rating = saved.getInt("reviewRating", -1);
            requestId = saved.getString("reviewRequestId", ""); payloadKey = saved.getString("reviewPayloadKey", "");
        }
    }
    void save(Bundle out) {
        out.putString("reviewDraft", draft); out.putInt("reviewRating", rating);
        out.putString("reviewRequestId", requestId); out.putString("reviewPayloadKey", payloadKey);
    }
    void close() { closed = true; }
    private int dp(int n) { return Math.round(n * activity.getResources().getDisplayMetrics().density); }
    private TextView text(LinearLayout box, String value, int size, boolean bold) {
        TextView view = new TextView(activity); view.setText(value); view.setTextSize(size); view.setTextColor(INK);
        view.setPadding(0, dp(6), 0, dp(8)); if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        box.addView(view); return view;
    }
    private Button button(LinearLayout box, String label, Runnable action) {
        Button button = new Button(activity); button.setText(label); button.setAllCaps(false); button.setTextSize(14);
        button.setTextColor(Color.WHITE); button.setBackgroundTintList(android.content.res.ColorStateList.valueOf(GREEN));
        button.setMinHeight(dp(48)); button.setOnClickListener(view -> action.run());
        box.addView(button, new LinearLayout.LayoutParams(-1, -2)); return button;
    }
    void show(LinearLayout box, String address, String session, String author) {
        parent = box; base = address; cookie = session;
        text(box, "Vos avis", 29, true);
        text(box, "Les expériences partagées sur le site et l’application SportsEnsemble.", 15, false).setTextColor(MUTED);
        text(box, "Ajouter un avis", 21, true);
        text(box, "Tu publies sous le nom " + author + ".", 14, false);
        text(box, "Ta note sur 10", 14, true);
        scores = new Spinner(activity);
        String[] options = new String[12]; options[0] = "Choisir une note";
        for (int i = 0; i <= 10; i++) options[i + 1] = i + " / 10";
        ArrayAdapter<String> adapter = new ArrayAdapter<>(activity, android.R.layout.simple_spinner_item, options);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item); scores.setAdapter(adapter);
        scores.setSelection(rating + 1); scores.setContentDescription("Ta note sur 10"); scores.setMinimumHeight(dp(48));
        scores.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            public void onItemSelected(AdapterView<?> p, View v, int position, long id) { rating = position - 1; }
            public void onNothingSelected(AdapterView<?> p) { rating = -1; }
        });
        box.addView(scores, new LinearLayout.LayoutParams(-1, -2));
        text(box, "Ton commentaire", 14, true);
        comment = new EditText(activity); comment.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        comment.setGravity(android.view.Gravity.TOP); comment.setMinLines(4); comment.setTextSize(16); comment.setTextColor(INK);
        comment.setFilters(new InputFilter[]{new InputFilter.LengthFilter(2000)}); comment.setHint("Partage ton expérience…"); comment.setText(draft); comment.setSaveEnabled(false);
        comment.addTextChangedListener(new TextWatcher() {
            public void beforeTextChanged(CharSequence s, int start, int count, int after) { }
            public void onTextChanged(CharSequence s, int start, int before, int count) { draft = s.toString(); }
            public void afterTextChanged(Editable e) { }
        });
        box.addView(comment, new LinearLayout.LayoutParams(-1, -2));
        text(box, "2 000 caractères maximum. Ton nom et ton avis seront publics. Une fois publié, l’avis ne pourra plus être modifié.", 12, false).setTextColor(MUTED);
        publication = text(box, feedback, 14, false); publication.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        publishButton = button(box, "Publier mon avis", this::publish);
        text(box, "Tous les avis", 23, true);
        refreshButton = button(box, "Actualiser les avis", () -> load(false));
        message = text(box, listMessage, 14, false); message.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        list = new LinearLayout(activity); list.setOrientation(LinearLayout.VERTICAL); box.addView(list);
        moreButton = button(box, "Voir les avis précédents", () -> load(true));
        drawList(); controls();
        if ((!loaded || System.currentTimeMillis() - fetchedAt > 60000) && !loading) load(false);
    }
    private void controls() {
        if (parent == null) return;
        publishButton.setEnabled(!posting); comment.setEnabled(!posting); scores.setEnabled(!posting);
        publishButton.setText(posting ? "Publication en cours…" : "Publier mon avis");
        refreshButton.setEnabled(!loading && !posting); moreButton.setEnabled(!loading && !posting);
        moreButton.setVisibility(cursor.isEmpty() ? View.GONE : View.VISIBLE);
        message.setText(listMessage); publication.setText(feedback);
    }
    private void drawList() {
        if (list == null) return;
        list.removeAllViews();
        DateTimeFormatter format = DateTimeFormatter.ofPattern("d MMMM yyyy · HH:mm", Locale.FRANCE).withZone(ZoneId.systemDefault());
        for (JSONObject review : reviews) {
            LinearLayout card = new LinearLayout(activity); card.setOrientation(LinearLayout.VERTICAL); card.setPadding(dp(16), dp(12), dp(16), dp(12));
            GradientDrawable background = new GradientDrawable(); background.setColor(Color.WHITE); background.setCornerRadius(dp(16)); background.setStroke(dp(1), Color.rgb(222,230,221)); card.setBackground(background);
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2); params.bottomMargin = dp(12); list.addView(card, params);
            text(card, review.optInt("rating") + " / 10", 23, true).setTextColor(GREEN);
            text(card, review.optString("authorName"), 17, true);
            String date = review.optString("createdAt"); try { date = format.format(Instant.parse(date)); } catch (Exception ignored) { }
            text(card, date, 12, false).setTextColor(MUTED);
            // Plain text only: user comments never become HTML or links.
            text(card, review.optString("comment"), 15, false);
        }
    }
    private void load(boolean append) {
        if (closed) return;
        if (loading) { if (!append) reloadAfter = true; return; }
        loading = true; listMessage = "Chargement des avis…"; controls();
        final String address = base, session = cookie, endpoint = "/api/auth/reviews" + (append && !cursor.isEmpty() ? "?before=" + cursor : "");
        network.execute(() -> {
            try {
                JSONObject result = Api.call(address, endpoint, null, session).data;
                JSONArray rows = result.getJSONArray("reviews"); String next = result.isNull("nextCursor") ? "" : result.optString("nextCursor");
                if (!next.isEmpty() && !next.matches("[a-f0-9]{24}")) throw new Exception("Invalid cursor");
                final String nextPage = next;
                activity.runOnUiThread(() -> {
                    if (closed || activity.isFinishing()) return;
                    if (!append) reviews.clear();
                    HashSet<String> ids = new HashSet<>(); for (JSONObject review : reviews) ids.add(review.optString("id"));
                    for (int i = 0; i < rows.length(); i++) { JSONObject review = rows.optJSONObject(i); if (review != null && ids.add(review.optString("id"))) reviews.add(review); }
                    cursor = nextPage; total = result.optInt("total"); loaded = true; fetchedAt = System.currentTimeMillis(); loading = false;
                    listMessage = total == 0 ? "Pas encore d’avis. Partage le premier !" : reviews.size() + " avis affichés sur " + total + " · les plus récents en premier";
                    drawList(); controls(); if (reloadAfter) { reloadAfter = false; load(false); }
                });
            } catch (Exception error) {
                activity.runOnUiThread(() -> { if (closed || activity.isFinishing()) return; loading = false; listMessage = failure(error); controls(); if (reloadAfter) { reloadAfter = false; load(false); } });
            }
        });
    }
    private void publish() {
        if (posting || closed) return;
        draft = comment.getText().toString(); rating = scores.getSelectedItemPosition() - 1;
        if (rating < 0 || draft.trim().isEmpty()) { feedback = "Choisis une note et écris un commentaire."; controls(); return; }
        final JSONObject body;
        try {
            String key = rating + ":" + draft.trim();
            if (!key.equals(payloadKey)) { requestId = UUID.randomUUID().toString(); payloadKey = key; }
            body = new JSONObject().put("rating", rating).put("comment", draft.trim()).put("requestId", requestId);
        } catch (Exception error) { return; }
        posting = true; feedback = "Publication en cours…"; controls(); final String address = base, session = cookie;
        network.execute(() -> {
            try {
                Api.call(address, "/api/auth/reviews", body, session);
                activity.runOnUiThread(() -> {
                    if (closed || activity.isFinishing()) return;
                    posting = false; draft = ""; rating = -1; requestId = ""; payloadKey = "";
                    feedback = "Ton avis est publié sur le site et l’application.";
                    if (comment != null) { comment.setText(""); scores.setSelection(0); }
                    controls(); load(false);
                });
            } catch (Exception error) {
                activity.runOnUiThread(() -> { if (closed || activity.isFinishing()) return; posting = false; feedback = failure(error); controls(); });
            }
        });
    }
    private String failure(Exception error) {
        return error instanceof Api.Failure ? error.getMessage() : "Connexion impossible. Ton texte est conservé. Vérifie Internet puis réessaie dans une minute.";
    }
}
