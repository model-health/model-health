import SwiftUI
import ModelHealth

struct LoginView: View {
    @State private var username = "warren@modelhealth.io"
    @State private var password = "testtesttesttesttest"
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showVerification = false
    @State private var isVerified = false
    @State private var isLoggedIn = false

    @EnvironmentObject private var modelHealth: ModelHealthService

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Spacer()

                VStack(spacing: 8) {
                    Image("AppIcon")
                        .font(.system(size: 60))
                        .foregroundColor(.blue)

                    Text("Welcome")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                }
                .padding(.bottom, 40)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Username")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    TextField("Enter username", text: $username)
                        .textFieldStyle(.roundedBorder)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }
                .padding(.horizontal)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Password")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    SecureField("Enter password", text: $password)
                        .textFieldStyle(.roundedBorder)
                }
                .padding(.horizontal)

                if let errorMessage = errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding(.horizontal)
                }

                Button(action: handleLogin) {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Login")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(username.isEmpty || password.isEmpty || isLoading)
                .padding(.horizontal)
                .padding(.top, 10)

                Spacer()
            }
            .navigationDestination(isPresented: $isLoggedIn) {
                CameraCalibrationView()
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
        errorMessage = nil
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
