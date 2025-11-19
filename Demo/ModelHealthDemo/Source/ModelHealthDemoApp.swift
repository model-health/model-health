import SwiftUI
import ModelHealth

@main
struct ModelHealthDemoApp: App {
    private let service: ModelHealthService = {
        if CommandLine.arguments.contains("--mock") {
            return ModelHealthService(serviceProvider: MockModelHealthProvider())
        }

        return ModelHealthService()
    }()

    @State private var isAuthenticated = false
    @State private var isCheckingAuth = true

    var body: some Scene {
        WindowGroup {
            Group {
                if isCheckingAuth {
                    ProgressView("Checking authentication...")
                } else if isAuthenticated {
                    NavigationStack {
                        CreateSessionView()
                            .onShakeLogout(isAuthenticated: $isAuthenticated)
                    }
                } else {
                    AuthenticationView {
                        isAuthenticated = true
                    }
                }
            }
            .environmentObject(service)
            .task {
                isAuthenticated = await service.isAuthenticated()
                isCheckingAuth = false
            }
        }
    }
}
