import SwiftUI
import ModelHealth

struct AuthenticationView: View {
    enum Mode {
        case login
        case register
    }

    @State private var mode: Mode = .login
    @EnvironmentObject private var modelHealth: ModelHealthService

    let onAuthenticationSuccess: () -> Void

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 8) {
                    Image("model-health")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 100, height: 100)

                    Text(mode == .login ? "Welcome Back" : "Create Account")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                }
                .padding(.vertical, 44)

                // Mode Toggle
                Picker("Mode", selection: $mode) {
                    Text("Login").tag(Mode.login)
                    Text("Register").tag(Mode.register)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                // Content
                switch mode {
                case .login:
                    LoginView(onAuthenticationSuccess: onAuthenticationSuccess)

                case .register:
                    RegistrationView(onAuthenticationSuccess: onAuthenticationSuccess)
                }
            }
            .task {
                // Clear any stale cookies
                if let cookies = HTTPCookieStorage.shared.cookies {
                    for cookie in cookies {
                        HTTPCookieStorage.shared.deleteCookie(cookie)
                    }
                }
            }
        }
    }
}

#Preview {
    AuthenticationView(onAuthenticationSuccess: {})
        .environmentObject(ModelHealthService())
}
