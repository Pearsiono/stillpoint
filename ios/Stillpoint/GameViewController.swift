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

final class GameViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate {
    private var webView: WKWebView!
    private let lightImpact = UIImpactFeedbackGenerator(style: .light)
    private let mediumImpact = UIImpactFeedbackGenerator(style: .medium)
    private let heavyImpact = UIImpactFeedbackGenerator(style: .heavy)
    private let notifFeedback = UINotificationFeedbackGenerator()
    private let nativeSaveKey = "stillpoint_save_v1"

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

        let contentController = WKUserContentController()
        contentController.add(self, name: "haptics")
        contentController.add(self, name: "storage")

        // Inject native environment flags + UserDefaults save backup before game scripts boot
        let savedJson = UserDefaults.standard.string(forKey: nativeSaveKey) ?? ""
        let escapedSave = escapeJSString(savedJson)
        let bootstrapSource = """
        window.__STILLPOINT_NATIVE__ = true;
        window.__STILLPOINT_NATIVE_SAVE__ = \(escapedSave);
        """
        let userScript = WKUserScript(
            source: bootstrapSource,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        contentController.addUserScript(userScript)

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
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if let wv = webView, wv.frame != view.bounds {
            wv.frame = view.bounds
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
        }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        let controller = webView.configuration.userContentController
        controller.removeAllUserScripts()
        let savedJson = UserDefaults.standard.string(forKey: nativeSaveKey) ?? ""
        let escapedSave = escapeJSString(savedJson)
        let bootstrapSource = """
        window.__STILLPOINT_NATIVE__ = true;
        window.__STILLPOINT_NATIVE_SAVE__ = \(escapedSave);
        """
        controller.addUserScript(WKUserScript(
            source: bootstrapSource,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))
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
