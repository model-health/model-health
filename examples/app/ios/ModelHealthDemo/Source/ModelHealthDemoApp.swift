// ModelHealthDemoApp.swift
import SwiftUI
import ModelHealth

@main
struct ModelHealthDemoApp: App {
    // swiftlint:disable:next force_try
    private let service = try! ModelHealthService(apiKey: ExampleConfig.apiKey)
    @State private var showSplash = true

    var body: some Scene {
        WindowGroup {
            ZStack {
                NavigationStack {
                    SessionListView()
                }
                .environmentObject(service)

                if showSplash {
                    SplashView()
                        .transition(.opacity)
                }
            }
            .task {
                try? await Task.sleep(nanoseconds: 1_500_000_000)

                withAnimation(.easeOut(duration: 0.4)) {
                    showSplash = false
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

        case .dataFile(let dataFileError):
            switch dataFileError {
            case .invalidEncoding:
                return "File encoding is not valid UTF-8"

            case .couldNotDetermineCSVColumns:
                return "Could not determine number of columns for CSV file"

            case .emptyFile:
                return "File contains no data"
            }

        case .internalError:
            return "Internal Error"

        case .notSupported:
            return "This API is no longer supported"
        }
    }
}
