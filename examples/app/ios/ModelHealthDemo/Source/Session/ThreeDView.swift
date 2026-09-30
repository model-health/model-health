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
    /// Whether the video is running, which is what the transport reports while the
    /// video is the one being driven.
    @State private var videoIsPlaying = false
    /// Where the thumb is being held, while it is being held.
    ///
    /// The playhead a drag asks for and the playhead the player reports are not the same
    /// thing for as long as the seek is in flight, and a slider bound to the second one
    /// snaps back to it under the finger. This holds the first until the drag ends.
    @State private var scrubTime: Double?
    /// The latest place the video has been asked to go, not yet asked for.
    @State private var pendingSeek: Double?
    /// Whether a seek is out and unanswered. See ``requestVideoSeek(_:)``.
    @State private var seekInFlight = false

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
                    // Deliberately not `VideoPlayer`: it brings its own transport, and a
                    // second set of controls beside the view's own is one the customer
                    // has to choose between. Here the video is what is driven, not what
                    // drives, so the controls below stay the only ones.
                    VideoSurface(player: player)
                        .frame(height: 220)
                        .onReceive(player.publisher(for: \.timeControlStatus)) { status in
                            // `!= .paused` rather than `== .playing`: a player waiting to
                            // reach its rate has been asked to play, and a button that
                            // flips back to "Play" while it does reads as a misfire.
                            videoIsPlaying = status != .paused
                        }
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
                    step(-1)
                } label: {
                    Image(systemName: "backward.frame.fill")
                }
                .disabled(!controller.isReady)

                Button {
                    isPlaying ? pause() : resume()
                } label: {
                    Label(
                        isPlaying ? "Pause" : "Play",
                        systemImage: isPlaying ? "pause.fill" : "play.fill"
                    )
                }
                .disabled(!controller.isReady)

                Button {
                    step(1)
                } label: {
                    Image(systemName: "forward.frame.fill")
                }
                .disabled(!controller.isReady)
            }
            .buttonStyle(.bordered)

            HStack(spacing: 12) {
                Slider(
                    value: Binding(
                        get: { scrubTime ?? controller.currentTime },
                        set: { time in
                            scrubTime = time
                            seek(to: time)
                        }
                    ),
                    in: 0...max(controller.duration, 0.01),
                    onEditingChanged: { editing in
                        if editing {
                            // Nothing should run out from under the finger: a playhead
                            // moving on its own turns a drag into a tug of war.
                            pause()
                        } else {
                            finishScrub()
                        }
                    }
                )
                .disabled(!controller.isReady)

                Text(String(format: "%.2f / %.2f s", scrubTime ?? controller.currentTime, controller.duration))
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
                setSpeed(newSpeed)
            }
        }
        .padding()
    }

    // MARK: - Transport
    //
    // One set of controls, whichever clock is running. While the video drives, these
    // drive the video and the model follows it through the time observer; otherwise they
    // drive the view directly. Which one it is stays inside these five, so the buttons
    // above never ask.

    var isPlaying: Bool {
        syncToVideo ? videoIsPlaying : controller.isPlaying
    }

    func resume() {
        guard let player, syncToVideo else {
            controller.play()
            return
        }
        // Play at the end of the video is a request to watch it, not to sit still at the
        // last frame — which is what `play()` alone would do there.
        if let end = player.currentItem?.duration.seconds, end.isFinite,
           player.currentTime().seconds >= end - 0.05 {
            player.seek(to: .zero)
        }
        // `defaultRate` rather than `rate`: setting the rate is itself a request to
        // play, so writing it while paused would start the video behind the button.
        player.defaultRate = Float(playbackSpeed)
        player.play()
    }

    func pause() {
        guard let player, syncToVideo else {
            controller.pause()
            return
        }
        player.pause()
    }

    func seek(to time: Double) {
        guard player != nil, syncToVideo else {
            controller.seek(to: time)
            return
        }
        // The model is not moved here: the player's own time observer reports the new
        // playhead a moment later, and moving it twice would fight that.
        requestVideoSeek(time)
    }

    /// Asks the video for a playhead, one request at a time.
    ///
    /// A new `seek` cancels the one before it, so a drag that asks sixty times a second
    /// cancels every one of them and the video does not move until the finger lifts.
    /// Only the latest request is worth making, so it is kept and sent when the one out
    /// there answers — the model follows along because each answered seek is a time jump
    /// the player's own observer reports.
    func requestVideoSeek(_ time: Double) {
        pendingSeek = time
        sendNextSeek()
    }

    func sendNextSeek() {
        guard !seekInFlight, let player, let time = pendingSeek else { return }

        pendingSeek = nil
        seekInFlight = true
        // Exactly, not nearly: a tolerant seek lands where it likes, and the thumb is
        // released onto wherever the player reports.
        player.seek(
            to: CMTime(seconds: time, preferredTimescale: 600),
            toleranceBefore: .zero,
            toleranceAfter: .zero
        ) { _ in
            Task { @MainActor in
                seekInFlight = false
                sendNextSeek()
            }
        }
    }

    /// Lets go of the thumb, onto where the drag left it.
    ///
    /// The model is moved there first, so letting go does not read the playhead the video
    /// has got to — during a drag that is behind, and the thumb would jump back to it.
    ///
    /// Deliberately not waiting on the video's own seek to answer: `AVPlayer` reports a
    /// seek as unfinished when anything else moves its timeline, `play()` included, and a
    /// thumb that is only released by that answer stays stuck when one goes missing.
    func finishScrub() {
        guard let time = scrubTime else { return }

        scrubTime = nil
        controller.seek(to: time)
        if syncToVideo {
            requestVideoSeek(time)
        }
    }

    func step(_ direction: Int) {
        guard let item = player?.currentItem, syncToVideo else {
            controller.step(direction)
            return
        }
        item.step(byCount: direction)
    }

    func setSpeed(_ speed: Double) {
        guard let player, syncToVideo else {
            controller.setPlaybackSpeed(speed)
            return
        }
        player.defaultRate = Float(speed)
        // Only while running: on a paused video this would be a play request.
        if player.timeControlStatus == .playing {
            player.rate = Float(speed)
        }
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
    }

    func stopFollowing() {
        if let videoObserver {
            player?.removeTimeObserver(videoObserver)
        }
        videoObserver = nil
        player?.pause()
        player = nil
        videoIsPlaying = false
        scrubTime = nil
        pendingSeek = nil
        seekInFlight = false
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

/// The video, and nothing else — no transport of its own.
///
/// `VideoPlayer` would bring its own controls, and this screen already has one set that
/// drives both the video and the model. Two would be a choice the customer has to make
/// and can only get wrong.
private struct VideoSurface: UIViewRepresentable {
    let player: AVPlayer

    func makeUIView(context: Context) -> PlayerView {
        let view = PlayerView()
        view.playerLayer.player = player
        view.playerLayer.videoGravity = .resizeAspect
        return view
    }

    func updateUIView(_ view: PlayerView, context: Context) {
        if view.playerLayer.player !== player {
            view.playerLayer.player = player
        }
    }

    /// A view backed by `AVPlayerLayer`, so the layer resizes with it rather than
    /// needing its frame kept in step by hand.
    final class PlayerView: UIView {
        override static var layerClass: AnyClass { AVPlayerLayer.self }
        // swiftlint:disable:next force_cast
        var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
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
