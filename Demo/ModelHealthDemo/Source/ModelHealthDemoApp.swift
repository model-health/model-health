// ModelHealthDemoApp.swift
import SwiftUI
import ModelHealth

@main
struct ModelHealthDemoApp: App {
    @State private var isMockBackend: Bool = CommandLine.arguments.contains("--mock")
    @State private var isAuthenticated = false
    @State private var isCheckingAuth = true

    private var service: ModelHealthService {
        if isMockBackend {
            return ModelHealthService(serviceProvider: MockModelHealthProvider())
        }
        
        return ModelHealthService()
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if isCheckingAuth {
                    ProgressView("Checking authentication...")
                } else if isAuthenticated {
                    NavigationStack {
                        CreateSessionView()
                            .onShakeDeveloperMenu(
                                isAuthenticated: $isAuthenticated,
                                isMockBackend: $isMockBackend
                            )
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
            .onChange(of: isMockBackend) { oldValue, newValue in
                isAuthenticated = false
                isCheckingAuth = true

                Task {
                    isAuthenticated = await service.isAuthenticated()
                    isCheckingAuth = false
                }
            }
        }
    }
}
