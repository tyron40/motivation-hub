package com.motivationfuel.legacy;

import android.app.Activity;
import android.os.Bundle;
import android.content.Intent;
import android.net.Uri;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.view.View;
import android.widget.*;
import org.json.*;
import java.net.*;
import java.io.*;

public class MainActivity extends Activity {
  private LinearLayout list;
  private EditText feed;
  private TextView status;
  private SharedPreferences prefs;
  private final int bg=Color.rgb(16,22,35);
  private void label(String text,int size) {
    TextView v=new TextView(this);v.setText(text);v.setTextColor(Color.WHITE);v.setTextSize(size);v.setPadding(8,12,8,12);list.addView(v);
  }
  private Button button(String title,final Runnable action) {
    Button b=new Button(this);b.setText(title);b.setOnClickListener(v->action.run());list.addView(b);return b;
  }
  @Override public void onCreate(Bundle b) {
    super.onCreate(b);prefs=getSharedPreferences("legacy",MODE_PRIVATE);
    ScrollView sc=new ScrollView(this);sc.setFillViewport(true);sc.setBackgroundColor(bg);
    list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);list.setPadding(20,24,20,20);sc.addView(list);setContentView(sc);
    label("MOTIVATION FUEL",28);label("Legacy • Android 4.4+",15);
    label("Public content feed URL (HTTPS JSON)",16);
    feed=new EditText(this);feed.setSingleLine(true);feed.setTextColor(Color.WHITE);feed.setHintTextColor(Color.LTGRAY);feed.setHint("https://your-domain.example/feed.json");feed.setText(prefs.getString("feed",""));list.addView(feed);
    button("Load content",()->load());
    button("Show saved favorites",()->showFavorites());
    status=new TextView(this);status.setTextColor(Color.LTGRAY);status.setPadding(8,12,8,12);list.addView(status);
    label("Use a feed of {items:[{title,url,category}]} with HTTPS links. Playback opens an installed media player.",13);
  }
  private void showFavorites(){
    String data=prefs.getString("favorites","[]");try{render(new JSONArray(data));}catch(Exception e){status.setText("Favorites could not be read.");}
  }
  private void load(){
    final String url=feed.getText().toString().trim();
    if(!url.startsWith("https://")){status.setText("Only HTTPS feeds are accepted.");return;}
    prefs.edit().putString("feed",url).apply();status.setText("Loading...");
    new Thread(()->{
      try{
        HttpURLConnection c=(HttpURLConnection)new URL(url).openConnection();c.setConnectTimeout(10000);c.setReadTimeout(10000);c.setInstanceFollowRedirects(false);
        int code=c.getResponseCode();if(code!=200)throw new IOException("HTTP "+code);
        ByteArrayOutputStream out=new ByteArrayOutputStream();InputStream in=c.getInputStream();byte[] buf=new byte[4096];int n;while((n=in.read(buf))!=-1){if(out.size()+n>1048576)throw new IOException("Feed too large");out.write(buf,0,n);}in.close();c.disconnect();
        JSONObject json=new JSONObject(out.toString("UTF-8"));JSONArray items=json.getJSONArray("items");
        runOnUiThread(()->render(items));
      }catch(Exception e){runOnUiThread(()->status.setText("Feed unavailable: "+e.getMessage()));}
    }).start();
  }
  private void render(JSONArray items){
    while(list.getChildCount()>7)list.removeViewAt(7);
    status.setText(items.length()+" items");
    for(int i=0;i<Math.min(items.length(),100);i++){
      try{
        JSONObject item=items.getJSONObject(i);String title=item.optString("title","Untitled"),url=item.optString("url",""),cat=item.optString("category","Motivation");
        label(cat+" • "+title,17);
        if(url.startsWith("https://"))button("Play / Open",()->{try{Intent intent=new Intent(Intent.ACTION_VIEW,Uri.parse(url));startActivity(intent);}catch(Exception e){Toast.makeText(this,"No compatible player installed",Toast.LENGTH_LONG).show();}});
        button("Save favorite",()->saveFavorite(item));
      }catch(Exception ignored){}
    }
  }
  private void saveFavorite(JSONObject item){
    try{JSONArray old=new JSONArray(prefs.getString("favorites","[]"));String url=item.optString("url");for(int i=0;i<old.length();i++)if(url.equals(old.getJSONObject(i).optString("url")))return;old.put(item);prefs.edit().putString("favorites",old.toString()).apply();Toast.makeText(this,"Saved locally",Toast.LENGTH_SHORT).show();}catch(Exception e){status.setText("Could not save favorite");}
  }
}
