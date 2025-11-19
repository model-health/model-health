import SwiftUI
import ModelHealth

struct RegistrationView: View {
    @State private var username = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var country = "United States"
    @State private var institution = ""
    @State private var profession = ""
    @State private var reason = ""
    @State private var website = ""
    @State private var language = "en"
    @State private var unit = RegistrationParameters.Unit.metric
    @State private var newsletter = true

    @State private var isLoading = false
    @State private var errorMessage: String = ""

    @EnvironmentObject private var modelHealth: ModelHealthService

    let onAuthenticationSuccess: () -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Username
                VStack(alignment: .leading, spacing: 8) {
                    Text("Username")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    TextField("Enter username", text: $username)
                        .textFieldStyle(.roundedBorder)
                        .autocorrectionDisabled()
#if os(iOS)
                        .textInputAutocapitalization(.never)
#endif
                }
                .padding(.horizontal)

                // Email
                VStack(alignment: .leading, spacing: 8) {
                    Text("Email")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    TextField("Enter email", text: $email)
                        .textFieldStyle(.roundedBorder)
                        .autocorrectionDisabled()
                        .keyboardType(.emailAddress)
#if os(iOS)
                        .textInputAutocapitalization(.never)
#endif
                }
                .padding(.horizontal)

                // Password
                VStack(alignment: .leading, spacing: 8) {
                    Text("Password (minimum 20 characters)")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    SecureField("Enter password", text: $password)
                        .textFieldStyle(.roundedBorder)
                }
                .padding(.horizontal)

                // Confirm Password
                VStack(alignment: .leading, spacing: 8) {
                    Text("Confirm Password")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    SecureField("Confirm password", text: $confirmPassword)
                        .textFieldStyle(.roundedBorder)
                }
                .padding(.horizontal)

                // Name fields
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("First Name")
                            .font(.subheadline)
                            .fontWeight(.medium)

                        TextField("First name", text: $firstName)
                            .textFieldStyle(.roundedBorder)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Last Name")
                            .font(.subheadline)
                            .fontWeight(.medium)

                        TextField("Last name", text: $lastName)
                            .textFieldStyle(.roundedBorder)
                    }
                }
                .padding(.horizontal)

                // Country
                VStack(alignment: .leading, spacing: 8) {
                    Text("Country")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    TextField("Country", text: $country)
                        .textFieldStyle(.roundedBorder)
                }
                .padding(.horizontal)

                // Institution
                VStack(alignment: .leading, spacing: 8) {
                    Text("Institution")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    TextField("Institution", text: $institution)
                        .textFieldStyle(.roundedBorder)
                }
                .padding(.horizontal)

                // Profession
                VStack(alignment: .leading, spacing: 8) {
                    Text("Profession")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    TextField("Profession", text: $profession)
                        .textFieldStyle(.roundedBorder)
                }
                .padding(.horizontal)

                // Reason
                VStack(alignment: .leading, spacing: 8) {
                    Text("Reason for Use")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    TextField("Reason for use", text: $reason)
                        .textFieldStyle(.roundedBorder)
                }
                .padding(.horizontal)

                // Website (Optional)
                VStack(alignment: .leading, spacing: 8) {
                    Text("Website (Optional)")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    TextField("Website", text: $website)
                        .textFieldStyle(.roundedBorder)
                        .keyboardType(.URL)
#if os(iOS)
                        .textInputAutocapitalization(.never)
#endif
                }
                .padding(.horizontal)

                // Language & Unit
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Language")
                            .font(.subheadline)
                            .fontWeight(.medium)

                        Picker("Language", selection: $language) {
                            Text("English").tag("en")
                            Text("German").tag("de")
                        }
                        .pickerStyle(.menu)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Units")
                            .font(.subheadline)
                            .fontWeight(.medium)

                        Picker("Units", selection: $unit) {
                            Text("Metric").tag("metric")
                            Text("Imperial").tag("imperial")
                        }
                        .pickerStyle(.menu)
                    }
                }
                .padding(.horizontal)

                // Newsletter
                Toggle("Sign up for newsletter", isOn: $newsletter)
                    .padding(.horizontal)

                // Error message
                if !errorMessage.isEmpty {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
                        .padding(.horizontal)
                }

                // Register button
                LoadingButton(
                    title: "Register",
                    isLoading: isLoading,
                    isDisabled: !isFormValid,
                    action: handleRegister
                )
                .padding(.horizontal)
                .padding(.top, 10)
                .padding(.bottom, 12)
            }
        }
    }

    private var isFormValid: Bool {
        !username.isEmpty &&
        !email.isEmpty &&
        !password.isEmpty &&
        !confirmPassword.isEmpty &&
        password == confirmPassword &&
        password.count >= 20 &&
        !firstName.isEmpty &&
        !lastName.isEmpty &&
        !country.isEmpty &&
        !institution.isEmpty &&
        !profession.isEmpty &&
        !reason.isEmpty
    }

    private func handleRegister() {
        errorMessage = ""

        // Validate password match
        guard password == confirmPassword else {
            errorMessage = "Passwords do not match"
            return
        }

        // Validate password length
        guard password.count >= 20 else {
            errorMessage = "Password must be at least 20 characters"
            return
        }

        // Validate email format
        guard email.contains("@") && email.contains(".") else {
            errorMessage = "Please enter a valid email address"
            return
        }

        isLoading = true

        Task {
            do {
                let params = RegistrationParameters(
                    username: username,
                    email: email,
                    password: password,
                    firstName: firstName,
                    lastName: lastName,
                    country: country,
                    institution: institution,
                    profession: profession,
                    reason: reason,
                    website: website.isEmpty ? nil : website,
                    language: language,
                    unit: unit,
                    newsletter: newsletter
                )

                _ = try await modelHealth.register(parameters: params)

                await MainActor.run {
                    isLoading = false
                    // Registration successful and auto-authenticated
                    onAuthenticationSuccess()
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = "Registration failed: \(error.localizedDescription)"
                }
            }
        }
    }
}

#Preview {
    RegistrationView(onAuthenticationSuccess: {})
        .environmentObject(ModelHealthService())
}
