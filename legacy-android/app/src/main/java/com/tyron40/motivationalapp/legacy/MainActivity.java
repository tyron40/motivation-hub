package com.tyron40.motivationalapp.legacy;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.AsyncTask;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public final class MainActivity extends Activity {
    private static final int ORANGE = Color.rgb(255, 138, 0);
    private static final int BACKGROUND = Color.rgb(17, 19, 24);
    private static final int SURFACE = Color.rgb(29, 33, 42);
    private static final String[] CATEGORIES = {
        "Motivation", "Success", "Mindset", "Inspiration", "Study",
        "High Energy", "Daily Motivation", "Powerful Speeches", "Church Motivation"
    };

    private final List<Speech> speeches = new ArrayList<Speech>();
    private SpeechAdapter adapter;
    private LibraryStore library;
    private ProgressBar progress;
    private TextView status;
    private EditText search;
    private Spinner categories;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        library = new LibraryStore(this);
        setContentView(buildScreen());
        loadTrending();
    }

    private View buildScreen() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BACKGROUND);
        root.setPadding(dp(14), dp(14), dp(14), dp(10));

        TextView title = text("MOTIVATION FUEL", 26, Color.WHITE);
        title.setTypeface(null, Typeface.BOLD);
        root.addView(title);
        TextView subtitle = text("Lite for Android 4.4–6.0", 13, Color.LTGRAY);
        root.addView(subtitle);

        LinearLayout nav = row();
        nav.addView(button("Discover", new View.OnClickListener() {
            @Override public void onClick(View v) { loadTrending(); }
        }));
        nav.addView(button("Favorites", new View.OnClickListener() {
            @Override public void onClick(View v) { showSpeeches(library.favorites(), "Favorites"); }
        }));
        nav.addView(button("Playlists", new View.OnClickListener() {
            @Override public void onClick(View v) { showPlaylists(); }
        }));
        nav.addView(button("AI Coach", new View.OnClickListener() {
            @Override public void onClick(View v) { showCoach(); }
        }));
        root.addView(nav);

        LinearLayout searchRow = row();
        search = new EditText(this);
        search.setHint("Search motivation");
        search.setSingleLine(true);
        search.setTextColor(Color.WHITE);
        search.setHintTextColor(Color.GRAY);
        search.setBackgroundColor(SURFACE);
        search.setPadding(dp(10), 0, dp(10), 0);
        searchRow.addView(search, new LinearLayout.LayoutParams(0, dp(46), 1));
        Button searchButton = button("Search", new View.OnClickListener() {
            @Override public void onClick(View v) { search(search.getText().toString()); }
        });
        searchRow.addView(searchButton);
        root.addView(searchRow);

        LinearLayout categoryRow = row();
        categories = new Spinner(this);
        ArrayAdapter<String> categoryAdapter = new ArrayAdapter<String>(this, android.R.layout.simple_spinner_item, CATEGORIES);
        categoryAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        categories.setAdapter(categoryAdapter);
        categoryRow.addView(categories, new LinearLayout.LayoutParams(0, dp(48), 1));
        categoryRow.addView(button("Load", new View.OnClickListener() {
            @Override public void onClick(View v) { loadCategory((String) categories.getSelectedItem()); }
        }));
        root.addView(categoryRow);

        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setIndeterminate(true);
        progress.setVisibility(View.GONE);
        root.addView(progress, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(4)));

        status = text("Loading daily motivation…", 13, Color.LTGRAY);
        status.setPadding(0, dp(8), 0, dp(8));
        root.addView(status);

        ListView list = new ListView(this);
        list.setDividerHeight(dp(8));
        list.setBackgroundColor(BACKGROUND);
        adapter = new SpeechAdapter();
        list.setAdapter(adapter);
        list.setOnItemClickListener(new AdapterView.OnItemClickListener() {
            @Override public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
                openSpeech(speeches.get(position));
            }
        });
        list.setOnItemLongClickListener(new AdapterView.OnItemLongClickListener() {
            @Override public boolean onItemLongClick(AdapterView<?> parent, View view, int position, long id) {
                showSpeechActions(speeches.get(position));
                return true;
            }
        });
        root.addView(list, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        return root;
    }

    private void loadTrending() {
        fetch("/api/youtube/trending", json("limit", 20), "Today’s Motivation");
    }

    private void loadCategory(String category) {
        JSONObject body = new JSONObject();
        try { body.put("category", category); body.put("limit", 30); } catch (Exception ignored) {}
        fetch("/api/youtube/category", body, category);
    }

    private void search(String query) {
        final String clean = query == null ? "" : query.trim();
        if (clean.length() == 0) { toast("Enter something to search."); return; }
        JSONObject body = new JSONObject();
        try { body.put("query", clean); body.put("limit", 30); } catch (Exception ignored) {}
        fetch("/api/youtube/search", body, "Search: " + clean);
    }

    private void fetch(final String endpoint, final JSONObject body, final String label) {
        progress.setVisibility(View.VISIBLE);
        status.setText("Loading " + label + "…");
        new AsyncTask<Void, Void, List<Speech>>() {
            private String error;
            @Override protected List<Speech> doInBackground(Void... unused) {
                try { return ApiClient.getSpeeches(MainActivity.this, endpoint, body); }
                catch (Exception e) { error = readableError(e); return null; }
            }
            @Override protected void onPostExecute(List<Speech> result) {
                progress.setVisibility(View.GONE);
                if (result == null) {
                    status.setText("Could not load content. " + error);
                    return;
                }
                showSpeeches(result, label);
            }
        }.execute();
    }

    private void showSpeeches(List<Speech> result, String label) {
        speeches.clear();
        speeches.addAll(result);
        adapter.notifyDataSetChanged();
        status.setText(label + " · " + result.size() + " speeches · Tap to play, hold to save");
    }

    private void openSpeech(Speech speech) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(speech.youtubeUrl()));
        try { startActivity(intent); }
        catch (ActivityNotFoundException e) { toast("No YouTube or browser app is available."); }
    }

    private void showSpeechActions(final Speech speech) {
        String favoriteLabel = library.isFavorite(speech.id) ? "Remove favorite" : "Add favorite";
        new AlertDialog.Builder(this)
            .setTitle(speech.title)
            .setItems(new String[] { "Play", favoriteLabel, "Add to playlist" }, new DialogInterface.OnClickListener() {
                @Override public void onClick(DialogInterface dialog, int which) {
                    if (which == 0) openSpeech(speech);
                    else if (which == 1) { library.toggleFavorite(speech); adapter.notifyDataSetChanged(); toast("Favorites updated."); }
                    else promptPlaylist(speech);
                }
            }).show();
    }

    private void promptPlaylist(final Speech speech) {
        final EditText input = new EditText(this);
        input.setHint("Playlist name");
        new AlertDialog.Builder(this)
            .setTitle("Add to playlist")
            .setView(input)
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Save", new DialogInterface.OnClickListener() {
                @Override public void onClick(DialogInterface d, int w) {
                    try { library.addToPlaylist(input.getText().toString(), speech); toast("Added to playlist."); }
                    catch (Exception e) { toast(e.getMessage()); }
                }
            }).show();
    }

    private void showPlaylists() {
        final List<String> names = library.playlistNames();
        if (names.isEmpty()) { toast("Hold a speech to create your first playlist."); return; }
        new AlertDialog.Builder(this)
            .setTitle("Playlists")
            .setItems(names.toArray(new String[names.size()]), new DialogInterface.OnClickListener() {
                @Override public void onClick(DialogInterface dialog, int which) {
                    String name = names.get(which);
                    showSpeeches(library.playlist(name), name);
                }
            }).show();
    }

    private void showCoach() {
        final LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(16), dp(4), dp(16), 0);
        final EditText prompt = new EditText(this);
        prompt.setHint("What do you need motivation for?");
        prompt.setMinLines(2);
        final TextView response = text("", 16, Color.DKGRAY);
        ScrollView scroll = new ScrollView(this);
        scroll.addView(response);
        content.addView(prompt);
        content.addView(scroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(180)));
        final AlertDialog dialog = new AlertDialog.Builder(this)
            .setTitle("AI Motivation Coach")
            .setView(content)
            .setNegativeButton("Close", null)
            .setPositiveButton("Send", null)
            .create();
        dialog.setOnShowListener(new DialogInterface.OnShowListener() {
            @Override public void onShow(DialogInterface ignored) {
                dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(new View.OnClickListener() {
                    @Override public void onClick(View v) {
                        final String text = prompt.getText().toString().trim();
                        if (text.length() == 0) return;
                        response.setText("Thinking…");
                        new AsyncTask<Void, Void, String>() {
                            private String error;
                            @Override protected String doInBackground(Void... unused) {
                                try { return ApiClient.chat(MainActivity.this, text); }
                                catch (Exception e) { error = readableError(e); return null; }
                            }
                            @Override protected void onPostExecute(String result) {
                                response.setText(result == null ? "Could not reach the coach. " + error : result);
                            }
                        }.execute();
                    }
                });
            }
        });
        dialog.show();
    }

    private final class SpeechAdapter extends ArrayAdapter<Speech> {
        SpeechAdapter() { super(MainActivity.this, android.R.layout.simple_list_item_2, speeches); }
        @Override public View getView(int position, View convertView, ViewGroup parent) {
            LinearLayout card = new LinearLayout(MainActivity.this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(dp(14), dp(12), dp(14), dp(12));
            card.setBackgroundColor(SURFACE);
            Speech speech = speeches.get(position);
            TextView title = text((library.isFavorite(speech.id) ? "★ " : "") + speech.title, 17, Color.WHITE);
            title.setTypeface(null, Typeface.BOLD);
            TextView speaker = text(speech.speaker, 13, Color.LTGRAY);
            card.addView(title);
            card.addView(speaker);
            return card;
        }
    }

    private JSONObject json(String key, int value) {
        JSONObject result = new JSONObject();
        try { result.put(key, value); } catch (Exception ignored) {}
        return result;
    }

    private String readableError(Exception e) {
        String message = e.getMessage();
        if (message == null || message.length() == 0) return "Check your internet connection.";
        return message.length() > 180 ? message.substring(0, 180) : message;
    }

    private LinearLayout row() {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(0, dp(8), 0, 0);
        return row;
    }

    private Button button(String label, View.OnClickListener listener) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextSize(12);
        button.setTextColor(Color.WHITE);
        button.setBackgroundColor(ORANGE);
        button.setMinHeight(dp(44));
        button.setOnClickListener(listener);
        return button;
    }

    private TextView text(String value, int size, int color) {
        TextView text = new TextView(this);
        text.setText(value);
        text.setTextSize(size);
        text.setTextColor(color);
        return text;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void toast(String message) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
    }
}
