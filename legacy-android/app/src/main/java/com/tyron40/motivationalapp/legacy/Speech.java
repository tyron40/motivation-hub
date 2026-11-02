package com.tyron40.motivationalapp.legacy;

import org.json.JSONException;
import org.json.JSONObject;

final class Speech {
    final String id;
    final String title;
    final String speaker;
    final String description;

    Speech(String id, String title, String speaker, String description) {
        this.id = id == null ? "" : id;
        this.title = title == null ? "Untitled speech" : title;
        this.speaker = speaker == null ? "Motivation Fuel" : speaker;
        this.description = description == null ? "" : description;
    }

    static Speech fromJson(JSONObject json) {
        return new Speech(
            json.optString("id"),
            json.optString("title"),
            json.optString("channelTitle", json.optString("speaker", "Motivation Fuel")),
            json.optString("description")
        );
    }

    JSONObject toJson() throws JSONException {
        JSONObject json = new JSONObject();
        json.put("id", id);
        json.put("title", title);
        json.put("channelTitle", speaker);
        json.put("description", description);
        return json;
    }

    String youtubeUrl() {
        return "https://www.youtube.com/watch?v=" + id;
    }
}
