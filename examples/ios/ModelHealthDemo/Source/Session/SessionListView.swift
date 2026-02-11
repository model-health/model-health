import SwiftUI
import ModelHealth

struct SessionListView: View {
    @EnvironmentObject private var modelHealth: ModelHealthService

    enum LoadingState {
        case notStarted
        case loading
        case loaded([Session], [Subject])
        case error(String)

        var sessions: [Session] {
            if case .loaded(let sessions, _) = self {
                return sessions
            }

            return []
        }

        var subjects: [Subject] {
            if case .loaded(_, let subjects) = self {
                return subjects
            }

            return []
        }
    }

    @State private var loadingState: LoadingState = .notStarted
    @State private var showingCreateSession = false

    var body: some View {
        NavigationStack {
            VStack {
                switch loadingState {
                case .notStarted, .loading:
                    Spacer()
                    ProgressView("Loading sessions...")
                    Spacer()

                case .error(let message) where loadingState.sessions.isEmpty:
                    Spacer()
                    errorStateView(message: message)
                    Spacer()

                case .loaded(let sessions, _) where sessions.isEmpty:
                    Spacer()
                    emptyStateView
                    Spacer()

                default:
                    sessionList
                }
            }
            .navigationTitle("Sessions")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink {
                        CreateSessionView()
                    } label: {
                        Image(systemName: "plus.circle.fill")
                    }
                }
            }
            .task {
                guard case .notStarted = loadingState else {
                    return
                }
                
                await loadSessions()
            }
            .refreshable {
                await loadSessions()
            }
        }
    }
}

private extension SessionListView {
    var sessionList: some View {
        List {
            ForEach(loadingState.sessions) { session in
                NavigationLink(value: session) {
                    SessionRow(session: session)
                }
            }
        }
        .listStyle(.plain)
        .navigationDestination(for: Session.self) { session in
            let subject = loadingState.subjects.first { $0.id == session.subject }

            guard let subject else {
                fatalError("Subject not found for session")
            }

            return RecordActivityView(subject: subject, session: session)
        }
    }

    var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "list.bullet.rectangle")
                .resizable()
                .scaledToFit()
                .frame(width: 150, height: 150)
                .foregroundColor(.gray.opacity(0.5))

            Text("No sessions yet")
                .font(.headline)

            Text("Create your first session to get started")
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

            Text("Failed to load sessions")
                .font(.headline)

            Text(message)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button("Try Again") {
                Task {
                    await loadSessions()
                }
            }
            .buttonStyle(.bordered)
        }
        .padding()
    }

    private func loadSessions() async {
        loadingState = .loading

        do {
            async let sessionsAsync = try await modelHealth.sessionList()
            async let subjectsAsync = try await modelHealth.subjectList()

            let (sessions, subjects) = try await (sessionsAsync, subjectsAsync)
            loadingState = .loaded(sessions, subjects)
        } catch let error as ModelHealthError {
            loadingState = .error(error.message)
        } catch {
            loadingState = .error("Failed to load: \(error.localizedDescription)")
        }
    }
}

struct SessionRow: View {
    let session: Session

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(session.name)
                .font(.headline)

            HStack {
                Text(session.sessionName)
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Spacer()

                if session.public {
                    Label("Public", systemImage: "globe")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            HStack {
                Label("\(session.activitiesCount)", systemImage: "doc.on.doc")
                    .font(.caption)
                    .foregroundColor(.secondary)

                if session.subject != nil {
                    Label("Subject", systemImage: "person")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    SessionListView()
        .environmentObject(ModelHealthService(serviceProvider: MockModelHealthProvider()))
}
