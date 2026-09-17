package fr.sportsensemble.agenda;

import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class Agenda {
    final JSONObject raw;
    final String userId, name;
    final Map<String, JSONObject> clubs = new LinkedHashMap<>();
    final List<JSONObject> sessions = new ArrayList<>();
    Agenda(JSONObject data) throws Exception {
        if (data.getInt("version") != 1) throw new Exception("Version de l’agenda non prise en charge.");
        raw = data; JSONObject user = data.getJSONObject("user");
        userId = user.getString("id"); name = user.getString("name");
        JSONArray items = data.getJSONArray("clubs");
        for (int i = 0; i < items.length(); i++) { JSONObject item = items.getJSONObject(i); clubs.put(item.getString("id"), item); }
        JSONArray slots = data.getJSONArray("sessions");
        for (int i = 0; i < slots.length(); i++) {
            JSONObject slot = slots.getJSONObject(i);
            int day = slot.getInt("day"), start = slot.getInt("start"), end = slot.getInt("end");
            if (day < 0 || day > 6 || start < 0 || start >= end || end > 1440) throw new Exception("Horaire invalide.");
            sessions.add(slot);
        }
        sessions.sort(Comparator.comparingInt((JSONObject s) -> s.optInt("day")).thenComparingInt(s -> s.optInt("start")));
    }
    List<JSONObject> onDay(int day) {
        List<JSONObject> result = new ArrayList<>();
        for (JSONObject item : sessions) if (item.optInt("day") == day) result.add(item);
        return result;
    }
    JSONObject club(JSONObject session) { return clubs.get(session.optString("clubId")); }
    static String time(int minutes) { return String.format(java.util.Locale.FRANCE, "%02d:%02d", minutes / 60, minutes % 60); }
    static String hours(JSONObject session) { return time(session.optInt("start")) + " – " + time(session.optInt("end")); }
    int minutes() { int n = 0; for (JSONObject item : sessions) n += item.optInt("end") - item.optInt("start"); return n; }
}
