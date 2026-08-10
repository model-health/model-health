import SwiftUI
import ModelHealth
import ModelHealthUI

private let syncTagSuffix = "-sync"

/// Demonstrates embedding the WKWebView-based 3D view.
struct ThreeDView: View {
    let activity: Activity
    let client: ModelHealthClient

    @StateObject private var controller: View3DController
    @State private var playbackSpeed: Double = 1.0

    init(activity: Activity, client: ModelHealthClient) {
        self.activity = activity
        self.client = client
        _controller = StateObject(
            wrappedValue: View3DController(
                for: activity,
                using: client,
                externalDataTag: ThreeDView.detectExternalDataTag(for: activity)
            )
        )
    }

    var body: some View {
        VStack(spacing: 0) {
            if controller.isLoadingTransforms {
                Spacer()
                ProgressView("Loading animation data...")
                Spacer()
            } else if let lastError = controller.lastError, !controller.isReady {
                Spacer()
                errorStateView(message: lastError)
                Spacer()
            } else {
                View3D(controller: controller)

                playbackControls
            }
        }
        .navigationTitle("3D View")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private extension ThreeDView {
    var playbackControls: some View {
        VStack(spacing: 12) {
            HStack(spacing: 16) {
                Button {
                    controller.step(-1)
                } label: {
                    Image(systemName: "backward.frame.fill")
                }
                .disabled(!controller.isReady)

                Button {
                    if controller.isPlaying {
                        controller.pause()
                    } else {
                        controller.play()
                    }
                } label: {
                    Label(
                        controller.isPlaying ? "Pause" : "Play",
                        systemImage: controller.isPlaying ? "pause.fill" : "play.fill"
                    )
                }
                .disabled(!controller.isReady)

                Button {
                    controller.step(1)
                } label: {
                    Image(systemName: "forward.frame.fill")
                }
                .disabled(!controller.isReady)
            }
            .buttonStyle(.bordered)

            HStack(spacing: 12) {
                Slider(
                    value: Binding(
                        get: { controller.currentTime },
                        set: { controller.seek(to: $0) }
                    ),
                    in: 0...max(controller.duration, 0.01)
                )
                .disabled(!controller.isReady)

                Text(String(format: "%.2f / %.2f s", controller.currentTime, controller.duration))
                    .font(.system(.caption, design: .monospaced))
                    .foregroundColor(.secondary)
                    .fixedSize()
            }

            Picker("Speed", selection: $playbackSpeed) {
                Text("0.25×").tag(0.25)
                Text("0.5×").tag(0.5)
                Text("1×").tag(1.0)
            }
            .pickerStyle(.segmented)
            .disabled(!controller.isReady)
            .onChange(of: playbackSpeed) { _, newSpeed in
                controller.setPlaybackSpeed(newSpeed)
            }
        }
        .padding()
    }

    func errorStateView(message: String) -> some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle")
                .resizable()
                .scaledToFit()
                .frame(width: 100, height: 100)
                .foregroundColor(.red.opacity(0.7))

            Text("Failed to load 3D view")
                .font(.headline)

            Text(message)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button("Try Again") {
                Task {
                    await controller.reload()
                }
            }
            .buttonStyle(.bordered)
        }
        .padding()
    }

    private static func detectExternalDataTag(for activity: Activity) -> String? {
        let result = activity.results.first { result in
            guard let tag = result.tag, tag.hasSuffix(syncTagSuffix) else {
                return false
            }

            guard let media = result.media else {
                return false
            }

            let path = media.split(separator: "?", maxSplits: 1).first.map(String.init) ?? media
            return path.hasSuffix(".sto")
        }

        guard let tag = result?.tag else {
            return nil
        }

        return String(tag.dropLast(syncTagSuffix.count))
    }
}

#Preview {
    NavigationStack {
        ThreeDView(
            activity: .forPreview(),
            client: ModelHealthClient(serviceProvider: MockModelHealthProvider())
        )
    }
}
