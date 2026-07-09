import SwiftUI
import AVKit
import ModelHealth

struct ActivityVideoView: View {
    @EnvironmentObject private var modelHealth: ModelHealthService

    let activity: Activity

    @State private var videoVersion: VideoVersion = .synced
    @State private var videosData: [VideoVersion: [Data]] = [:]
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        VStack {
            Picker("Video Version", selection: $videoVersion) {
                Text("Raw").tag(VideoVersion.raw)
                Text("Synced").tag(VideoVersion.synced)
            }
            .pickerStyle(.segmented)
            .padding()
            .onChange(of: videoVersion) { _, _ in
                if let _ = videosData[videoVersion] {
                    return
                }

                Task {
                    await loadVideos()
                }
            }

            if isLoading {
                Spacer()
                ProgressView("Loading videos...")
                Spacer()
            } else if let errorMessage = errorMessage, videosData.isEmpty {
                Spacer()
                errorStateView(message: errorMessage)
                Spacer()
            } else if videosData.isEmpty {
                Spacer()
                emptyStateView
                Spacer()
            } else {
                videoList
            }
        }
        .navigationTitle("Activity Videos")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadVideos()
        }
        .refreshable {
            await loadVideos()
        }
    }
}

private extension ActivityVideoView {
    var selectedVideos: [Data] {
        videosData[videoVersion] ?? []
    }

    var videoList: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                ForEach(Array(selectedVideos.enumerated()), id: \.offset) { index, videoData in
                    VideoPlayerCard(
                        videoData: videoData,
                        title: "Video \(index + 1)",
                        version: videoVersion
                    )
                }
            }
            .padding()
        }
    }

    var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "video.slash")
                .resizable()
                .scaledToFit()
                .frame(width: 100, height: 100)
                .foregroundColor(.gray.opacity(0.5))

            Text("No videos available")
                .font(.headline)

            Text("No \(videoVersion == .raw ? "raw" : "synced") videos found for this activity")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
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

            Text("Failed to load videos")
                .font(.headline)

            Text(message)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button("Try Again") {
                Task {
                    await loadVideos()
                }
            }
            .buttonStyle(.bordered)
        }
        .padding()
    }

    func loadVideos() async {
        isLoading = true
        errorMessage = nil

        videosData[videoVersion] = await modelHealth.videos(for: activity, version: videoVersion)

        isLoading = false
    }
}

struct VideoPlayerCard: View {
    let videoData: Data
    let title: String
    let version: VideoVersion

    @State private var player: AVPlayer?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title)
                    .font(.headline)

                Spacer()

                Label(
                    version == .raw ? "Raw" : "Synced",
                    systemImage: version == .raw ? "video" : "video.badge.checkmark"
                )
                .font(.caption)
                .foregroundColor(.secondary)
            }
            .padding(.horizontal)

            if let player = player {
                VideoPlayer(player: player)
                    .frame(height: 300)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .onDisappear {
                        player.pause()
                    }
            } else {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.gray.opacity(0.2))
                    .frame(height: 300)
                    .overlay {
                        ProgressView()
                    }
            }
        }
        .task {
            await loadPlayer()
        }
    }

    private func loadPlayer() async {
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension("mp4")

        do {
            try videoData.write(to: tempURL)
            player = AVPlayer(url: tempURL)
        } catch {
            print("Failed to write video data: \(error)")
        }
    }
}

#Preview {
    NavigationStack {
        ActivityVideoView(activity: .forPreview())
            .environmentObject(ModelHealthService(serviceProvider: MockModelHealthProvider()))
    }
}
