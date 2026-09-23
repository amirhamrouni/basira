package com.basira.spiritportal;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import io.capawesome.capacitorjs.plugins.firebase.authentication.FirebaseAuthenticationPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register explicitly so authentication cannot silently disappear from a packaged APK.
        registerPlugin(FirebaseAuthenticationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
