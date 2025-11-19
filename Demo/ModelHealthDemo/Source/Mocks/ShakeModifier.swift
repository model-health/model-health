// ShakeModifier.swift
import SwiftUI
import ModelHealth

extension View {
    func onShakeLogout(isAuthenticated: Binding<Bool>) -> some View {
        modifier(ShakeModifier(isAuthenticated: isAuthenticated))
    }
}

struct ShakeModifier: ViewModifier {
    @EnvironmentObject private var service: ModelHealthService
    @State private var showLogoutAlert = false
    @Binding var isAuthenticated: Bool

    func body(content: Content) -> some View {
        content
            .background(
                ShakeGestureDetector {
                    showLogoutAlert = true
                }
            )
            .alert("Logout", isPresented: $showLogoutAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Logout", role: .destructive) {
                    handleLogout()
                }
            } message: {
                Text("Do you want to log out?")
            }
    }

    private func handleLogout() {
        Task {
            do {
                try await service.logout()
                await MainActor.run {
                    isAuthenticated = false
                }
            } catch {
            }
        }
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
