import AVFoundation
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        configureAmbientAudioSession()

        let window = UIWindow(frame: UIScreen.main.bounds)
        window.backgroundColor = UIColor(red: 22.0 / 255.0, green: 22.0 / 255.0, blue: 26.0 / 255.0, alpha: 1.0)
        window.rootViewController = GameViewController()
        window.makeKeyAndVisible()
        self.window = window
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        configureAmbientAudioSession()
    }

    private func configureAmbientAudioSession() {
        // Ambient + mixWithOthers guarantees Spotify / Apple Music never pause when STILLPOINT opens
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
            try session.setActive(true)
        } catch {
            // Non-fatal; audio falls back gracefully
        }
    }
}
