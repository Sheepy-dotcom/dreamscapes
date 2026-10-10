import Capacitor
import UIKit

/// Registers the two plugins that live in this app rather than in a package.
///
/// Capacitor discovers plugins from the packages listed in its generated
/// Package.swift. A plugin written here is in none of them, so conforming to
/// CAPBridgedPlugin is not enough on its own - the bridge never sees the class
/// and the JavaScript side finds nothing under Capacitor.Plugins. Both of ours
/// were in that state: Sign in with Apple was never offered in the app, and
/// DreamAudio fell through to the web audio path every launch.
class ViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppleSignInPlugin())
        bridge?.registerPluginInstance(DreamAudioPlugin())
    }
}
