import AuthenticationServices
import Capacitor
import Foundation
import UIKit

/// Sign in with Apple, natively.
///
/// Written here rather than taken from a plugin: the community Apple plugin
/// pins capacitor-swift-pm to 7.x, which cannot coexist with RevenueCat's 8.x,
/// and the one that does support Capacitor 8 drags the Google and Facebook SDKs
/// into a children's app. Sixty lines of AuthenticationServices costs nothing
/// and cannot conflict with anything.
///
/// The JavaScript side hands over the SHA-256 hash of its nonce, which is what
/// Apple expects; Supabase is given the original and hashes it again to compare
/// against the token's claim.
@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise)
    ]

    /// Apple's controller is not retained by the system, so both it and the call
    /// it belongs to have to be held here or the sheet closes with no answer.
    private var pendingCall: CAPPluginCall?
    private var controller: ASAuthorizationController?

    @objc func authorize(_ call: CAPPluginCall) {
        guard pendingCall == nil else {
            call.reject("A sign-in is already in progress.")
            return
        }

        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        if let nonce = call.getString("nonce") {
            request.nonce = nonce
        }

        pendingCall = call
        call.keepAlive = true

        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            self.controller = controller
            controller.performRequests()
        }
    }

    private func finish(_ body: (CAPPluginCall) -> Void) {
        guard let call = pendingCall else { return }
        pendingCall = nil
        controller = nil
        body(call)
    }
}

extension AppleSignInPlugin: ASAuthorizationControllerDelegate {
    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard
            let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let tokenData = credential.identityToken,
            let identityToken = String(data: tokenData, encoding: .utf8)
        else {
            finish { $0.reject("Apple did not return an identity token.") }
            return
        }

        // Apple sends the name only on the very first authorisation, so anything
        // that wants it has to save it then or never see it again.
        finish {
            $0.resolve([
                "identityToken": identityToken,
                "user": credential.user,
                "email": credential.email ?? "",
                "givenName": credential.fullName?.givenName ?? "",
                "familyName": credential.fullName?.familyName ?? ""
            ])
        }
    }

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        // A parent backing out of the sheet is not an error the app should shout
        // about, so it is given a code the JavaScript side can recognise.
        let code = (error as? ASAuthorizationError)?.code
        let cancelled = code == .canceled
        finish {
            $0.reject(
                cancelled ? "Sign in with Apple was cancelled." : error.localizedDescription,
                cancelled ? "1001" : nil,
                error
            )
        }
    }
}

extension AppleSignInPlugin: ASAuthorizationControllerPresentationContextProviding {
    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        bridge?.viewController?.view.window
            ?? UIApplication.shared.connectedScenes
                .compactMap { ($0 as? UIWindowScene)?.keyWindow }
                .first
            ?? ASPresentationAnchor()
    }
}
