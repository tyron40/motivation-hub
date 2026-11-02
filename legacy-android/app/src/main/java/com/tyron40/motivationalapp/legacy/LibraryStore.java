package com.tyron40.motivationalapp.legacy;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

final class LibraryStore {
    private static final String PREFS = "motivation_fuel_legacy_library";
    private static final String FAVORITES = "favorites";
    private static final String PLAYLISTS = "playlists";
    private final SharedPreferences prefs;

    LibraryStore(Context context) {
        prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    boolean isFavorite(String id) {
        for (Speech speech : favorites()) if (speech.id.equals(id)) return true;
        return false;
    }

    void toggleFavorite(Speech speech) {
        List<Speech> values = favorites();
        boolean removed = false;
        for (int i = values.size() - 1; i >= 0; i--) {
            if (values.get(i).id.equals(speech.id)) {
                values.remove(i);
                removed = true;
            }
        }
        if (!removed) values.add(0, speech);
        prefs.edit().putString(FAVORITES, encode(values).toString()).apply();
    }

    List<Speech> favorites() {
        try {
            return decode(new JSONArray(prefs.getString(FAVORITES, "[]")));
        } catch (Exception ignored) {
            return new ArrayList<Speech>();
        }
    }

    void addToPlaylist(String name, Speech speech) throws Exception {
        String clean = name == null ? "" : name.trim();
        if (clean.length() == 0) throw new Exception("Enter a playlist name.");
        JSONObject playlists = new JSONObject(prefs.getString(PLAYLISTS, "{}"));
        JSONArray items = playlists.optJSONArray(clean);
        if (items == null) items = new JSONArray();
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i);
            if (item != null && speech.id.equals(item.optString("id"))) return;
        }
        items.put(speech.toJson());
        playlists.put(clean, items);
        prefs.edit().putString(PLAYLISTS, playlists.toString()).apply();
    }

    List<String> playlistNames() {
        List<String> names = new ArrayList<String>();
        try {
            JSONObject playlists = new JSONObject(prefs.getString(PLAYLISTS, "{}"));
            Iterator<String> keys = playlists.keys();
            while (keys.hasNext()) names.add(keys.next());
        } catch (Exception ignored) {}
        return names;
    }

    List<Speech> playlist(String name) {
        try {
            JSONObject playlists = new JSONObject(prefs.getString(PLAYLISTS, "{}"));
            JSONArray values = playlists.optJSONArray(name);
            return values == null ? new ArrayList<Speech>() : decode(values);
        } catch (Exception ignored) {
            return new ArrayList<Speech>();
        }
    }

    private JSONArray encode(List<Speech> speeches) {
        JSONArray result = new JSONArray();
        for (Speech speech : speeches) {
            try { result.put(speech.toJson()); } catch (Exception ignored) {}
        }
        return result;
    }

    private List<Speech> decode(JSONArray array) {
        List<Speech> result = new ArrayList<Speech>();
        for (int i = 0; i < array.length(); i++) {
            JSONObject item = array.optJSONObject(i);
            if (item != null) result.add(Speech.fromJson(item));
        }
        return result;
    }
}
