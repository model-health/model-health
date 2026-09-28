import AVKit
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

    /// Whether the recorded video drives the model rather than the view's own clock.
    @State private var syncToVideo = false
    @State private var player: AVPlayer?
    @State private var videoObserver: Any?
    @State private var videoError: String?

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
                if syncToVideo, let player {
                    VideoPlayer(player: player)
                        .frame(height: 220)
                }

                View3D(controller: controller)

                if let videoError {
                    Text(videoError)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal)
                }

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
            // The point of the external clock: the model follows a clock it does not own.
            // With it on, `play()` does nothing and only `seek(to:)` moves the model, so
            // the video's own playhead is what drives it.
            Toggle("Follow the recorded video", isOn: $syncToVideo)
                .font(.subheadline)
                .disabled(!controller.isReady)
                .onChange(of: syncToVideo) { _, following in
                    Task { await followVideo(following) }
                }

            HStack(spacing: 16) {
                Button {
                    controller.step(-1)
                } label: {
                    Image(systemName: "backward.frame.fill")
                }
                .disabled(!controller.isReady || syncToVideo)

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

    /// Hands the model's clock to the recorded video, or takes it back.
    ///
    /// While the video is in charge the model never advances on its own; every frame the
    /// player reports is passed straight to ``View3DController/seek(to:)``, which is safe
    /// at that rate because the controller coalesces rapid calls.
    func followVideo(_ following: Bool) async {
        controller.setExternalClock(following)

        guard following else {
            stopFollowing()
            return
        }

        videoError = nil
        let videos = await client.videos(for: activity, version: .synced)

        // The download outlives the switch. Turned off while it ran, there is nothing to
        // follow any more — and carrying on would leave a hidden video driving the model
        // with its own clock switched off. Turned off and on again, a second player would
        // take the first one's place and leave it running.
        guard syncToVideo, player == nil else {
            return
        }

        guard let data = videos.first else {
            videoError = "This activity has no synced video to follow."
            syncToVideo = false
            controller.setExternalClock(false)
            return
        }

        let file = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension("mp4")
        do {
            try data.write(to: file)
        } catch {
            videoError = "Could not open the video: \(error.localizedDescription)"
            syncToVideo = false
            controller.setExternalClock(false)
            return
        }

        let player = AVPlayer(url: file)
        // Once per frame at 60fps. The controller sends on at most ~20 per second, which
        // is the whole reason a caller may drive it this fast.
        let step = CMTime(seconds: 1.0 / 60.0, preferredTimescale: 600)
        videoObserver = player.addPeriodicTimeObserver(forInterval: step, queue: .main) { time in
            controller.seek(to: time.seconds)
        }
        self.player = player
        player.play()
    }

    func stopFollowing() {
        if let videoObserver {
            player?.removeTimeObserver(videoObserver)
        }
        videoObserver = nil
        player?.pause()
        player = nil
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
