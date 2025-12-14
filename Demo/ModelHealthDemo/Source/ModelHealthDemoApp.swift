// ModelHealthDemoApp.swift
import SwiftUI
import ModelHealth

@main
struct ModelHealthDemoApp: App {
    @State private var isMockBackend: Bool
    @State private var isAuthenticated = false
    @State private var isCheckingAuth = true

    private let service: ModelHealthService

    init() {
        let isMockBackend = CommandLine.arguments.contains("--mock")
        self._isMockBackend = .init(initialValue: isMockBackend)

        if isMockBackend {
            service = ModelHealthService(serviceProvider: MockModelHealthProvider())
        } else {
            service = try! ModelHealthService()
        }
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

extension ModelHealthError {
    var message: String {
        switch self {
        case .url(let code):
            return "URL Error: \(code)"

        case .calibration(let reason):
            switch reason {
            case .notEnoughCameras:
                return "Calibration Error: Not enough cameras"
            case .calibrationFailed:
                return "Calibration Error: Calibration failed"
            }

        case .http(let httpError):
            switch httpError {
            case .clientError(statusCode: let statusCode):
                return "Client Error: \(statusCode)"

            case .serverError(statusCode: let statusCode):
                return "Server Error: \(statusCode)"

            case .unexpectedStatusCode(statusCode: let statusCode):
                return "Unexpected Status Code: \(statusCode)"
            }

        case .unexpectedResponse:
            return "Unexpected Server Response"

        case .internalError:
            return "Internal Error"

        case .dataFile(_):
            return "Data File Error"
        }
    }
}
