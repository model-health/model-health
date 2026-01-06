import SwiftUI
import ModelHealth

extension View {
    func onShakeDeveloperMenu(
        isAuthenticated: Binding<Bool>,
        isMockBackend: Binding<Bool>
    ) -> some View {
        modifier(
            ShakeModifier(
                isAuthenticated: isAuthenticated,
                isMockBackend: isMockBackend
            )
        )
    }
}

struct ShakeModifier: ViewModifier {
    @EnvironmentObject private var service: ModelHealthService
    @State private var showDeveloperMenu = false
    @Binding var isAuthenticated: Bool
    @Binding var isMockBackend: Bool

    func body(content: Content) -> some View {
        content
            .background(
                ShakeGestureDetector {
                    showDeveloperMenu = true
                }
            )
            .confirmationDialog(
                "Developer Options",
                isPresented: $showDeveloperMenu,
                titleVisibility: .visible
            ) {
                Button("Logout") {
                    handleLogout()
                }

                Button(isMockBackend ? "Switch to Real Backend" : "Switch to Mock Backend") {
                    toggleBackend()
                }

                Button("Cancel", role: .cancel) {
                }
            } message: {
                Text("Current backend: \(isMockBackend ? "Mock" : "Real")")
            }
    }

    private func handleLogout() {
        Task {
            try? await service.logout()
            await MainActor.run {
                isAuthenticated = false
            }
        }
    }

    private func toggleBackend() {
        isMockBackend.toggle()
    }
}

private struct ShakeGestureDetector: UIViewControllerRepresentable {
    let onShake: () -> Void

    func makeUIViewController(context: Context) -> ShakeDetectorViewController {
        ShakeDetectorViewController(onShake: onShake)
    }

    func updateUIViewController(_ uiViewController: ShakeDetectorViewController, context: Context) {}

    class ShakeDetectorViewController: UIViewController {
        let onShake: () -> Void

        init(onShake: @escaping () -> Void) {
            self.onShake = onShake
            super.init(nibName: nil, bundle: nil)
        }

        required init?(coder: NSCoder) {
            fatalError("init(coder:) has not been implemented")
        }

        override func motionEnded(_ motion: UIEvent.EventSubtype, with event: UIEvent?) {
            if motion == .motionShake {
                onShake()
            }
        }
    }
}
