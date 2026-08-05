/// Model Health Swift examples — set video upload mode.
///
/// Usage:
///   swift run VideoUploadMode [<api_key>]

import Foundation
import ModelHealth
import Shared

private let modeDescriptions: [ModelHealth.VideoUploadMode: String] = [
    .enabled: "Devices upload recorded video normally.",
    .disabled: "Devices stop uploading recorded video.",
    .flush: "Re-enables uploads, and uploads any videos queued locally while disabled."
]

// MARK: - Entry point

@main
struct VideoUploadModeExample {
    static func main() async {
        let apiKey = loadAPIKey()
        let client = connect(apiKey: apiKey)
        let mode = pickMode()
        await applyMode(mode, client: client)
        print("Done.")
    }
}

// MARK: - Setup

private func connect(apiKey: String) -> ModelHealthClient {
    print("Connecting...")
    do {
        return try ModelHealthClient(apiKey: apiKey)
    } catch {
        fputs("Failed to initialise: \(error)\n", stderr)
        exit(1)
    }
}

// MARK: - Mode selection

private func pickMode() -> ModelHealth.VideoUploadMode {
    print()
    let modes: [ModelHealth.VideoUploadMode] = [.enabled, .disabled, .flush]
    return pickOne(
        from: modes,
        prompt: "Select video upload mode",
        label: { "\($0)  —  \(modeDescriptions[$0] ?? "")" }
    )
}

// MARK: - Apply

private func applyMode(_ mode: ModelHealth.VideoUploadMode, client: ModelHealthClient) async {
    print("\nSetting video upload mode to '\(mode)'...")
    do {
        try await client.setVideoUploadMode(mode)
    } catch {
        fputs("Failed to set video upload mode: \(error)\n", stderr)
        exit(1)
    }
}
