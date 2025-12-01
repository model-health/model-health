import SwiftUI
import ModelHealth

struct LoginView: View {
    @State private var username = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String = ""
    @State private var showVerification = false
    @State private var isVerified = false

    @EnvironmentObject private var modelHealth: ModelHealthService

    let onAuthenticationSuccess: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Username")
                    .font(.subheadline)
                    .fontWeight(.medium)

                TextField("Enter username", text: $username)
                    .textFieldStyle(.roundedBorder)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
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

            if !errorMessage.isEmpty {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundColor(.red)
                    .padding(.horizontal)
            }

            Spacer()

            LoadingButton(
                title: "Login",
                isLoading: isLoading,
                isDisabled: !isFormValid,
                action: handleLogin
            )
            .padding(.horizontal)
            .padding(.top, 10)
            .padding(.bottom, 12)
        }
        .sheet(isPresented: $showVerification) {
            VerificationView(isVerified: $isVerified)
        }
        .onChange(of: isVerified) { _, newValue in
            if newValue {
                onAuthenticationSuccess()
            }
        }
    }

    private var isFormValid: Bool {
        !username.isEmpty && !password.isEmpty
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
                        onAuthenticationSuccess()

                    case .verificationRequired:
                        showVerification = true
                    }
                }
            } catch let error as ModelHealthError {
                await MainActor.run {
                    isLoading = false
                    errorMessage = "Login failed: \(error.message)"
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
    LoginView(onAuthenticationSuccess: {})
        .environmentObject(ModelHealthService(serviceProvider: MockModelHealthProvider()))
}
