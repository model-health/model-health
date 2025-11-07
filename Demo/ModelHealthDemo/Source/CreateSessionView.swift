import SwiftUI
import ModelHealth

struct CreateSessionView: View {
    @EnvironmentObject private var modelHealth: ModelHealthService

    @State private var createdSession: Session?
    @State private var sessionForNavigation: Session?
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        VStack {
            Spacer()

            // QR Code Display
            if
                let session = createdSession,
                let qrcodeURL = URL(string: session.qrcode ?? "") {
                qrCode(url: qrcodeURL)
            } else {
                emptyState
            }

            // Error Message
            if let errorMessage = errorMessage {
                Text(errorMessage)
                    .foregroundColor(.red)
                    .font(.caption)
                    .padding()
            }

            Spacer()

            // Action Button
            Button(action: {
                if createdSession != nil {
                    sessionForNavigation = createdSession
                } else {
                    // Create session
                    Task {
                        await createSession()
                    }
                }
            }) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .frame(maxWidth: .infinity)
                        .padding()
                } else {
                    Text(createdSession != nil ? "Continue" : "Create Session")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                }
            }
            .background(Color.accentColor)
            .cornerRadius(10)
            .padding()
            .disabled(isLoading)
            .navigationDestination(item: $sessionForNavigation) { session in
                CameraCalibrationView(session: session)
            }
        }
    }
}

private extension CreateSessionView {
    func qrCode(url: URL) -> some View {
        VStack(spacing: 20) {
            Text("Scan this QR code to connect")
                .font(.headline)

            AsyncImage(url: url) { phase in
                switch phase {
                case .empty:
                    ProgressView()
                        .frame(width: 250, height: 250)
                case .success(let image):
                    image
                        .resizable()
                        .interpolation(.none)
                        .scaledToFit()
                        .frame(width: 250, height: 250)
                case .failure:
                    VStack {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.largeTitle)
                        Text("Failed to load QR code")
                            .font(.caption)
                    }
                    .frame(width: 250, height: 250)
                @unknown default:
                    EmptyView()
                }
            }
        }
        .padding()
    }

    var emptyState: some View {
        Image(systemName: "qrcode.viewfinder")
            .resizable()
            .scaledToFit()
            .frame(width: 150, height: 150)
            .foregroundColor(.gray.opacity(0.5))
    }

    func createSession() async {
        isLoading = true
        errorMessage = nil

        do {
            let newSession = try await modelHealth.createSession()
            createdSession = newSession
        } catch {
            errorMessage = "Failed to create session: \(error.localizedDescription)"
        }

        isLoading = false
    }
}

#Preview {
    NavigationStack {
        CreateSessionView()
            .environmentObject(ModelHealthService())
    }
}
