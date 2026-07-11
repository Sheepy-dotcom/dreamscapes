package cloud.dreamscapes.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DreamAudioPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
