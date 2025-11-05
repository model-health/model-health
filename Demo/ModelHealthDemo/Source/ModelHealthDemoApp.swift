import SwiftUI
import ModelHealth

@main
struct ModelHealthDemoApp: App {
    var body: some Scene {
        WindowGroup {
            LoginView()
                .environmentObject(ModelHealthService())
        }
    }
}
