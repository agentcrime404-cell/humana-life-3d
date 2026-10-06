package it.humana.lungomare;

import android.Manifest;
import android.content.pm.PackageManager;
import android.media.AudioManager;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Voce di prossimità: l'audio degli altri giocatori parte senza bisogno di toccare lo schermo.
    getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
    // Permesso del microfono chiesto subito a livello di sistema (senza, alcuni telefoni registrano silenzio).
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
      ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, 7);
    }
    // Tasto/gesto Indietro: lo gestisce il gioco (chiude telefono, menu, finestre); mai uscire dall'app di colpo.
    getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
      @Override
      public void handleOnBackPressed() {
        getBridge().getWebView().evaluateJavascript("(window.humanaBack&&window.humanaBack())?'1':'0'", r -> {
          if (r == null || !r.contains("1")) moveTaskToBack(true);
        });
      }
    });
  }

  @Override
  public void onResume() {
    super.onResume();
    // Modalità comunicazione con vivavoce: microfono attivo anche sui Samsung, audio dall'altoparlante.
    AudioManager audio = (AudioManager) getSystemService(AUDIO_SERVICE);
    if (audio != null) { audio.setMode(AudioManager.MODE_IN_COMMUNICATION); audio.setSpeakerphoneOn(true); }
  }

  @Override
  public void onPause() {
    super.onPause();
    AudioManager audio = (AudioManager) getSystemService(AUDIO_SERVICE);
    if (audio != null) { audio.setMode(AudioManager.MODE_NORMAL); audio.setSpeakerphoneOn(false); }
  }
}
