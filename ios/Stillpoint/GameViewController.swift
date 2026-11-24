import AppTrackingTransparency
import GameKit
import GoogleMobileAds
import UIKit
import WebKit

private final class StillpointSchemeHandler: NSObject, WKURLSchemeHandler {
    private let rootURL: URL

    init(rootURL: URL) {
        self.rootURL = rootURL.standardizedFileURL
        super.init()
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let reqURL = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(URLError(.badURL))
            return
        }

        var relPath = reqURL.path
        if relPath.isEmpty || relPath == "/" {
            relPath = "index.html"
        } else if relPath.hasPrefix("/") {
            relPath.removeFirst()
        }

        let fileURL = rootURL.appendingPathComponent(relPath).standardizedFileURL
        let rootPrefix = rootURL.path.hasSuffix("/") ? rootURL.path : rootURL.path + "/"
        guard fileURL.path.hasPrefix(rootPrefix),
              let data = try? Data(contentsOf: fileURL) else {
            let notFound = HTTPURLResponse(
                url: reqURL,
                statusCode: 404,
                httpVersion: "HTTP/1.1",
                headerFields: ["Content-Type": "text/plain"]
            )!
            urlSchemeTask.didReceive(notFound)
            urlSchemeTask.didFinish()
            return
        }

        let mime = mimeType(for: fileURL.pathExtension.lowercased())
        let response = HTTPURLResponse(
            url: reqURL,
            statusCode: 200,
            httpVersion: "HTTP/1.1",
            headerFields: [
                "Content-Type": mime,
                "Content-Length": "\(data.count)",
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=3600"
            ]
        )!

        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        // Nothing async to cancel
    }

    private func mimeType(for ext: String) -> String {
        switch ext {
        case "html": return "text/html; charset=utf-8"
        case "js", "mjs": return "application/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json": return "application/json; charset=utf-8"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "woff2": return "font/woff2"
        case "woff": return "font/woff"
        case "wasm": return "application/wasm"
        default: return "application/octet-stream"
        }
    }
}

final class GameViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate, GKGameCenterControllerDelegate, FullScreenContentDelegate {
    private var webView: WKWebView!
    private let lightImpact = UIImpactFeedbackGenerator(style: .light)
    private let mediumImpact = UIImpactFeedbackGenerator(style: .medium)
    private let heavyImpact = UIImpactFeedbackGenerator(style: .heavy)
    private let notifFeedback = UINotificationFeedbackGenerator()
    private let nativeSaveKey = "stillpoint_save_v1"

    private var adsBootStarted = false
    private var rewardedAd: RewardedAd?
    private var isLoadingAd = false
    private var pendingRewardEarned = false

    private var appStoreServicesEnabled: Bool {
        (Bundle.main.object(forInfoDictionaryKey: "STILLPOINTAppStoreServices") as? String)?.uppercased() == "YES"
    }

    private var rewardedAdUnitId: String {
        let configured = Bundle.main.object(forInfoDictionaryKey: "STILLPOINTRewardedAdUnitId") as? String
        if let id = configured, !id.isEmpty, !id.contains("$(") {
            return id
        }
        return "ca-app-pub-3940256099942544/1712485313"
    }

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 22.0 / 255.0, green: 22.0 / 255.0, blue: 26.0 / 255.0, alpha: 1.0)

        lightImpact.prepare()
        mediumImpact.prepare()
        heavyImpact.prepare()
        notifFeedback.prepare()

        if appStoreServicesEnabled {
            setupCloudSyncObserver()
        }

        let contentController = WKUserContentController()
        let weakBridge = WeakScriptMessageHandler(delegate: self)
        contentController.add(weakBridge, name: "haptics")
        contentController.add(weakBridge, name: "storage")
        contentController.add(weakBridge, name: "gameCenter")
        contentController.add(weakBridge, name: "ads")
        injectBootstrapScript(into: contentController)

        let config = WKWebViewConfiguration()
        config.userContentController = contentController
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        if let webRoot = Bundle.main.resourceURL?.appendingPathComponent("WebApp") {
            let schemeHandler = StillpointSchemeHandler(rootURL: webRoot)
            config.setURLSchemeHandler(schemeHandler, forURLScheme: "stillpoint")
        }

        let wv = WKWebView(frame: view.bounds, configuration: config)
        wv.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        wv.navigationDelegate = self
        wv.isOpaque = false
        wv.backgroundColor = view.backgroundColor
        wv.scrollView.backgroundColor = view.backgroundColor
        wv.scrollView.isScrollEnabled = false
        wv.scrollView.bounces = false
        wv.scrollView.showsVerticalScrollIndicator = false
        wv.scrollView.showsHorizontalScrollIndicator = false
        wv.scrollView.contentInsetAdjustmentBehavior = .never
        wv.allowsBackForwardNavigationGestures = false
        wv.allowsLinkPreview = false

        view.addSubview(wv)
        self.webView = wv

        if let startURL = URL(string: "stillpoint://game/index.html") {
            wv.load(URLRequest(url: startURL))
        }

        if appStoreServicesEnabled {
            authenticateGameCenter()
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if let wv = webView, wv.frame != view.bounds {
            wv.frame = view.bounds
        }
    }

    private var isPresentingAd = false

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    func onAppBecameActive() {
        guard appStoreServicesEnabled else { return }
        if adsBootStarted {
            if rewardedAd == nil && !isLoadingAd && !isPresentingAd {
                loadRewardedAd()
            }
            return
        }
        adsBootStarted = true
        // Apple Guideline 5.1.2: request ATT only after app is active & rendered
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.9) { [weak self] in
            guard let self = self else { return }
            if ATTrackingManager.trackingAuthorizationStatus == .notDetermined {
                ATTrackingManager.requestTrackingAuthorization { _ in
                    DispatchQueue.main.async {
                        self.startAdsSdk()
                    }
                }
            } else {
                self.startAdsSdk()
            }
        }
    }

    private func startAdsSdk() {
        MobileAds.shared.start { [weak self] _ in
            DispatchQueue.main.async {
                self?.loadRewardedAd()
            }
        }
    }

    private func loadRewardedAd() {
        guard appStoreServicesEnabled, !isLoadingAd, rewardedAd == nil else { return }
        isLoadingAd = true
        let unitId = rewardedAdUnitId
        Task { [weak self] in
            do {
                let loaded = try await RewardedAd.load(with: unitId, request: Request())
                await MainActor.run {
                    guard let self = self else { return }
                    self.isLoadingAd = false
                    self.rewardedAd = loaded
                    self.rewardedAd?.fullScreenContentDelegate = self
                    self.notifyAdReady(true)
                }
            } catch {
                await MainActor.run {
                    guard let self = self else { return }
                    self.isLoadingAd = false
                    self.rewardedAd = nil
                    self.notifyAdReady(false)
                    DispatchQueue.main.asyncAfter(deadline: .now() + 15.0) { [weak self] in
                        self?.loadRewardedAd()
                    }
                }
            }
        }
    }

    private func presentRewardedAd() {
        guard appStoreServicesEnabled else {
            deliverAdResult(ok: false, rewarded: false, reason: "Ads disabled")
            return
        }
        guard presentedViewController == nil else {
            deliverAdResult(ok: false, rewarded: false, reason: "Close current overlay first")
            return
        }
        guard let ad = rewardedAd else {
            loadRewardedAd()
            deliverAdResult(ok: false, rewarded: false, reason: "No ad ready yet. Try again in a moment.")
            return
        }
        pendingRewardEarned = false
        isPresentingAd = true
        notifyLifecycle("audio_began")
        ad.present(from: self) { [weak self] in
            self?.pendingRewardEarned = true
        }
    }

    func adDidDismissFullScreenContent(_ ad: any FullScreenPresentingAd) {
        let earned = pendingRewardEarned
        pendingRewardEarned = false
        isPresentingAd = false
        rewardedAd = nil
        notifyAdReady(false)
        notifyLifecycle("audio_ended")
        deliverAdResult(ok: true, rewarded: earned, reason: earned ? nil : "dismissed")
        loadRewardedAd()
    }

    func ad(_ ad: any FullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) {
        pendingRewardEarned = false
        isPresentingAd = false
        rewardedAd = nil
        notifyAdReady(false)
        notifyLifecycle("audio_ended")
        deliverAdResult(ok: false, rewarded: false, reason: "Ad could not load")
        loadRewardedAd()
    }

    private func notifyAdReady(_ ready: Bool) {
        DispatchQueue.main.async { [weak self] in
            let js = "window.__STILLPOINT_AD_READY__ = \(ready ? "true" : "false"); window.__stillpointOnAdReady && window.__stillpointOnAdReady(\(ready ? "true" : "false"));"
            self?.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    private func deliverAdResult(ok: Bool, rewarded: Bool, reason: String?) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let reasonJS = reason.map { self.escapeJSString($0) } ?? "undefined"
            let js = "window.__stillpointOnAdResult && window.__stillpointOnAdResult({ok:\(ok ? "true" : "false"),rewarded:\(rewarded ? "true" : "false"),reason:\(reasonJS)});"
            self.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    func notifyLifecycle(_ event: String) {
        if isPresentingAd && (event == "active" || event == "audio_ended") {
            return
        }
        DispatchQueue.main.async { [weak self] in
            guard let wv = self?.webView else { return }
            let js = "window.__stillpointOnAppLifecycle && window.__stillpointOnAppLifecycle('\(event)');"
            wv.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    private func injectBootstrapScript(into controller: WKUserContentController) {
        let savedJson = UserDefaults.standard.string(forKey: nativeSaveKey) ?? ""
        let cloudJson = appStoreServicesEnabled
            ? (NSUbiquitousKeyValueStore.default.string(forKey: nativeSaveKey) ?? "")
            : ""
        let gcReady = appStoreServicesEnabled && GKLocalPlayer.local.isAuthenticated
        let adsNative = appStoreServicesEnabled
        let adReady = rewardedAd != nil
        let bootstrapSource = """
        window.__STILLPOINT_NATIVE__ = true;
        window.__STILLPOINT_NATIVE_SAVE__ = \(escapeJSString(savedJson));
        window.__STILLPOINT_CLOUD_SAVE__ = \(escapeJSString(cloudJson));
        window.__STILLPOINT_GC_READY__ = \(gcReady ? "true" : "false");
        window.__STILLPOINT_ADS_NATIVE__ = \(adsNative ? "true" : "false");
        window.__STILLPOINT_AD_READY__ = \(adReady ? "true" : "false");
        """
        controller.addUserScript(WKUserScript(
            source: bootstrapSource,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))
    }

    private func setupCloudSyncObserver() {
        NSUbiquitousKeyValueStore.default.synchronize()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleCloudStoreChange(_:)),
            name: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
            object: NSUbiquitousKeyValueStore.default
        )
    }

    @objc private func handleCloudStoreChange(_ notification: Notification) {
        guard let cloudJson = NSUbiquitousKeyValueStore.default.string(forKey: nativeSaveKey),
              !cloudJson.isEmpty else {
            return
        }
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let wv = self.webView else { return }
            let js = "window.__stillpointOnCloudSave && window.__stillpointOnCloudSave(\(self.escapeJSString(cloudJson)));"
            wv.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    private func authenticateGameCenter() {
        let player = GKLocalPlayer.local
        player.authenticateHandler = { [weak self] authVC, _ in
            guard let self = self else { return }
            if let vc = authVC {
                DispatchQueue.main.async {
                    if self.presentedViewController == nil {
                        self.present(vc, animated: true)
                    }
                }
                return
            }
            let ready = player.isAuthenticated
            DispatchQueue.main.async {
                let js = "window.__STILLPOINT_GC_READY__ = \(ready ? "true" : "false"); window.__stillpointOnGameCenterReady && window.__stillpointOnGameCenterReady(\(ready ? "true" : "false"));"
                self.webView?.evaluateJavaScript(js, completionHandler: nil)
            }
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "haptics", let kind = message.body as? String {
            DispatchQueue.main.async {
                switch kind {
                case "light":
                    self.lightImpact.impactOccurred(intensity: 0.65)
                    self.lightImpact.prepare()
                case "medium":
                    self.mediumImpact.impactOccurred(intensity: 0.85)
                    self.mediumImpact.prepare()
                case "heavy":
                    self.heavyImpact.impactOccurred(intensity: 1.0)
                    self.heavyImpact.prepare()
                case "success":
                    self.notifFeedback.notificationOccurred(.success)
                    self.notifFeedback.prepare()
                case "warning":
                    self.notifFeedback.notificationOccurred(.warning)
                    self.notifFeedback.prepare()
                case "error":
                    self.notifFeedback.notificationOccurred(.error)
                    self.notifFeedback.prepare()
                default:
                    self.lightImpact.impactOccurred()
                }
            }
            return
        }

        if message.name == "storage",
           let dict = message.body as? [String: Any],
           let action = dict["action"] as? String,
           action == "set",
           let key = dict["key"] as? String,
           let value = dict["value"] as? String {
            UserDefaults.standard.set(value, forKey: key)
            if appStoreServicesEnabled {
                NSUbiquitousKeyValueStore.default.set(value, forKey: key)
                NSUbiquitousKeyValueStore.default.synchronize()
            }
            return
        }

        if message.name == "ads",
           let dict = message.body as? [String: Any],
           let action = dict["action"] as? String,
           action == "showRewarded" {
            DispatchQueue.main.async { [weak self] in
                self?.presentRewardedAd()
            }
            return
        }

        if message.name == "gameCenter",
           appStoreServicesEnabled,
           GKLocalPlayer.local.isAuthenticated,
           let dict = message.body as? [String: Any],
           let action = dict["action"] as? String {
            if action == "submitScore",
               let lbId = dict["leaderboardId"] as? String,
               let scoreNum = dict["score"] as? NSNumber,
               scoreNum.intValue > 0 {
                GKLeaderboard.submitScore(scoreNum.intValue, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [lbId]) { _ in }
            } else if action == "reportAchievement",
                      let achId = dict["achievementId"] as? String,
                      let pctNum = dict["percent"] as? NSNumber {
                let ach = GKAchievement(identifier: achId)
                ach.percentComplete = max(0, min(100, pctNum.doubleValue))
                ach.showsCompletionBanner = true
                GKAchievement.report([ach]) { _ in }
            } else if action == "showLeaderboards" {
                DispatchQueue.main.async { [weak self] in
                    guard let self = self, self.presentedViewController == nil else { return }
                    let gcVC = GKGameCenterViewController(state: .leaderboards)
                    gcVC.gameCenterDelegate = self
                    self.present(gcVC, animated: true)
                }
            }
        }
    }

    func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        let controller = webView.configuration.userContentController
        controller.removeAllUserScripts()
        injectBootstrapScript(into: controller)
        if let startURL = URL(string: "stillpoint://game/index.html") {
            webView.load(URLRequest(url: startURL))
        }
    }

    private func escapeJSString(_ raw: String) -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: [raw], options: []),
              let arr = String(data: data, encoding: .utf8),
              arr.count >= 2 else {
            return "\"\""
        }
        return String(arr.dropFirst().dropLast())
    }
}

private final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {
    private weak var delegate: WKScriptMessageHandler?

    init(delegate: WKScriptMessageHandler) {
        self.delegate = delegate
        super.init()
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        delegate?.userContentController(userContentController, didReceive: message)
    }
}
