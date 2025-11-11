import SwiftUI
import ModelHealth

struct LoginView: View {
    @State private var username = "warren@modelhealth.io"
    @State private var password = "testtesttesttesttest"
    @State private var isLoading = false
    @State private var errorMessage: String = ""
    @State private var showVerification = false
    @State private var isVerified = false
    @State private var isLoggedIn = false

    @EnvironmentObject private var modelHealth: ModelHealthService

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                VStack(spacing: 8) {
                    Image("model-health")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 100, height: 100)

                    Text("Welcome")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                }
                .padding(.vertical, 44)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Username")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    TextField("Enter username", text: $username)
                        .textFieldStyle(.roundedBorder)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }
                .padding([.horizontal, .bottom])

                VStack(alignment: .leading, spacing: 8) {
                    Text("Password")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    SecureField("Enter password", text: $password)
                        .textFieldStyle(.roundedBorder)
                }
                .padding(.horizontal)

                Text(errorMessage)
                    .font(.caption)
                    .foregroundColor(.red)
                    .padding([.horizontal, .top], 16)

                Spacer()

                LoadingButton(
                    title: "Login",
                    isLoading: isLoading,
                    isDisabled: username.isEmpty || password.isEmpty,
                    action: handleLogin
                )
                .padding(.horizontal)
                .padding(.top, 10)
                .padding(.bottom, 12)
            }
            .navigationDestination(isPresented: $isLoggedIn) {
                CreateSessionView()
            }
            .sheet(isPresented: $showVerification) {
                VerificationView(isVerified: $isVerified)
            }
            .onChange(of: isVerified) { _, newValue in
                if newValue {
                    isLoggedIn = true
                }
            }
            .task {
                if let cookies = HTTPCookieStorage.shared.cookies {
                    for cookie in cookies {
                        HTTPCookieStorage.shared.deleteCookie(cookie)
                    }
                }
            }
        }
    }

    private func handleLogin() {
        errorMessage = ""
        isLoading = true

        Task {
            do {
                let result = try await modelHealth.login(
                    username: username,
                    password: password
                )

                await MainActor.run {
                    isLoading = false

                    switch result {
                    case .ok:
                        isLoggedIn = true

                    case .verificationRequired:
                        showVerification = true
                    }
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = "Login failed: \(error.localizedDescription)"
                }
            }
        }
    }
}

#Preview {
    LoginView()
        .environmentObject(ModelHealthService())
}
