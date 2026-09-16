import SwiftUI
import ModelHealth

/// Sessions — the capture workflows activities are recorded under.
///
/// The narrowest of the four lists: a subject and an order is everything it accepts.
struct BrowseSessionsView: View {
    @EnvironmentObject private var modelHealth: ModelHealthClient
    @StateObject private var model = BrowseModel<SessionStream>()

    @State private var subjects: [Subject] = []
    @State private var subjectID: Int?
    @State private var order: SessionOrderBy = .createdAtDescending

    private let orders: [(String, SessionOrderBy)] = [
        ("Newest first", .createdAtDescending),
        ("Oldest first", .createdAt),
        ("Name A–Z", .name),
        ("Name Z–A", .nameDescending)
    ]

    var body: some View {
        BrowseScreen(model: model, title: "Sessions", apply: { Task { await apply() } }, rowID: \.id) {
            BrowseFilters {
                Picker("Subject", selection: $subjectID) {
                    Text("Any subject").tag(Int?.none)
                    ForEach(subjects) { subject in
                        Text(subject.name).tag(Int?.some(subject.id))
                    }
                }

                Picker("Order", selection: $order) {
                    ForEach(orders, id: \.1.rawValue) { name, value in
                        Text(name).tag(value)
                    }
                }
            }
        } row: { session in
            BrowseSessionRow(session: session)
        }
        .task {
            if subjects.isEmpty {
                subjects = (try? await modelHealth.subjects.list().all()) ?? []
            }

            if case .notStarted = model.state {
                await apply()
            }
        }
    }
}

private extension BrowseSessionsView {
    var selectedSubject: Subject? {
        subjects.first { $0.id == subjectID }
    }

    func apply() async {
        await model.open(step: browseLoadStep) {
            modelHealth.sessions.list(subject: selectedSubject, orderBy: order)
        }
    }
}

struct BrowseSessionRow: View {
    let session: Session

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(session.name)
                .font(.subheadline)

            HStack(spacing: 8) {
                Text(session.subject.map { "subject #\($0)" } ?? "no subject")
                Text("\(session.activitiesCount) activities")
                Spacer()
                Text(BrowseFormat.day(session.createdAt))
            }
            .font(.caption)
            .foregroundColor(.secondary)
        }
    }
}

#Preview {
    NavigationStack {
        BrowseSessionsView()
            .environmentObject(ModelHealthClient(serviceProvider: MockModelHealthProvider()))
    }
}
