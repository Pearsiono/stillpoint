import AVFoundation
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    private weak var gameController: GameViewController?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        configureAmbientAudioSession()
        observeAudioInterruptions()

        let window = UIWindow(frame: UIScreen.main.bounds)
        window.backgroundColor = UIColor(red: 22.0 / 255.0, green: 22.0 / 255.0, blue: 26.0 / 255.0, alpha: 1.0)
        let vc = GameViewController()
        self.gameController = vc
        window.rootViewController = vc
        window.makeKeyAndVisible()
        self.window = window
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        configureAmbientAudioSession()
        application.isIdleTimerDisabled = true
        gameController?.notifyLifecycle("active")
    }

    func applicationWillResignActive(_ application: UIApplication) {
        application.isIdleTimerDisabled = false
        gameController?.notifyLifecycle("resign")
    }

    private func observeAudioInterruptions() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAudioInterruption(_:)),
            name: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance()
        )
    }

    @objc private func handleAudioInterruption(_ notification: Notification) {
        guard let info = notification.userInfo,
              let rawType = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: rawType) else {
            return
        }
        switch type {
        case .began:
            gameController?.notifyLifecycle("audio_began")
        case .ended:
            configureAmbientAudioSession()
            gameController?.notifyLifecycle("audio_ended")
        @unknown default:
            break
        }
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
