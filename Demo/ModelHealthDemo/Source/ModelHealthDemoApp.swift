import SwiftUI
import ModelHealth

@main
struct ModelHealthDemoApp: App {
    private let service: ModelHealthService = {
        if CommandLine.arguments.contains("--mock") {
            return ModelHealthService(serviceProvider: MockModelHealthProvider())
        } else {
            return ModelHealthService()
        }
    }()

    var body: some Scene {
        WindowGroup {
            LoginView()
                .environmentObject(service)
        }
    }
}
