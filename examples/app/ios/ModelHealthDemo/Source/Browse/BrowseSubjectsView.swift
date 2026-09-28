import SwiftUI
import ModelHealth

/// Subjects — the people activities are recorded for.
struct BrowseSubjectsView: View {
    @EnvironmentObject private var modelHealth: ModelHealthClient
    @StateObject private var model = BrowseModel<SubjectStream>()

    @State private var groups: [SubjectGroup] = []
    @State private var sessions: [Session] = []
    @State private var activityTypes: [ActivityTypeInfo] = []

    @State private var search = ""
    @State private var groupID: Int?
    @State private var sessionID: String?
    @State private var activityTypeID: Int?
    @State private var tagsText = ""
    @State private var createdByText = ""
    @State private var activityComplete: Bool?
    @State private var order: SubjectOrderBy = .name
    @State private var hasCreatedAfter = false
    @State private var createdAfter = Date()
    @State private var hasCreatedBefore = false
    @State private var createdBefore = Date()

    private let orders: [(String, SubjectOrderBy)] = [
        ("Name A–Z", .name),
        ("Name Z–A", .nameDescending),
        ("Newest first", .createdAtDescending),
        ("Oldest first", .createdAt),
        ("Recently updated", .updatedAtDescending),
        ("Least recently updated", .updatedAt)
    ]

    var body: some View {
        BrowseScreen(model: model, title: "Subjects", apply: { Task { await apply() } }, rowID: \.id) {
            BrowseFilters {
                TextField("Search by name", text: $search)
                    .textFieldStyle(.roundedBorder)

                Picker("Group", selection: $groupID) {
                    Text("Any group").tag(Int?.none)
                    ForEach(groups) { group in
                        Text(group.name).tag(Int?.some(group.id))
                    }
                }

                Picker("Calibrated under", selection: $sessionID) {
                    Text("Any session").tag(String?.none)
                    ForEach(sessions) { session in
                        Text(session.name).tag(String?.some(session.id))
                    }
                }

                Picker("Has activity of type", selection: $activityTypeID) {
                    Text("Any type").tag(Int?.none)
                    ForEach(activityTypes, id: \.id) { type in
                        Text(type.displayName).tag(Int?.some(type.id))
                    }
                }

                Picker("Activities finished", selection: $activityComplete) {
                    Text("Either way").tag(Bool?.none)
                    Text("All finished").tag(Bool?.some(true))
                    Text("Not all finished").tag(Bool?.some(false))
                }

                OptionalDateField(label: "Added after", isOn: $hasCreatedAfter, date: $createdAfter)
                OptionalDateField(label: "Added before", isOn: $hasCreatedBefore, date: $createdBefore)

                TextField("Tags, comma separated", text: $tagsText)
                    .textFieldStyle(.roundedBorder)
                TextField("Account ids, comma separated", text: $createdByText)
                    .keyboardType(.numbersAndPunctuation)
                    .textFieldStyle(.roundedBorder)

                Picker("Order", selection: $order) {
                    ForEach(orders, id: \.1.rawValue) { name, value in
                        Text(name).tag(value)
                    }
                }
            }
        } row: { subject in
            BrowseSubjectRow(subject: subject)
        }
        .task {
            if groups.isEmpty {
                groups = (try? await modelHealth.groups.list().all()) ?? []
            }
            if sessions.isEmpty {
                sessions = (try? await modelHealth.sessions.list().all()) ?? []
            }
            // The types this account can use, rather than a list written into the app:
            // an account can add its own, and a fixed list would never show them.
            if activityTypes.isEmpty {
                activityTypes = (try? await modelHealth.activityTypes()) ?? []
            }

            if case .notStarted = model.state {
                await apply()
            }
        }
    }
}

private extension BrowseSubjectsView {
    func apply() async {
        await model.open(step: browseLoadStep) {
            modelHealth.subjects.list(
                search: search.isEmpty ? nil : search,
                createdAfter: hasCreatedAfter ? createdAfter : nil,
                createdBefore: hasCreatedBefore ? createdBefore : nil,
                groups: groupID.map { [String($0)] },
                tags: BrowseInput.list(tagsText),
                createdBy: BrowseInput.ids(createdByText),
                activityType: activityTypes.first { $0.id == activityTypeID },
                activityComplete: activityComplete,
                session: sessions.first { $0.id == sessionID },
                orderBy: order
            )
        }
    }
}

struct BrowseSubjectRow: View {
    let subject: Subject

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(subject.name)
                .font(.subheadline)

            HStack(spacing: 8) {
                Text("#\(subject.id)")
                Text("\(subject.activityCount ?? 0) activities")
                Spacer()
                Text(BrowseFormat.day(subject.createdAt))
            }
            .font(.caption)
            .foregroundColor(.secondary)
        }
    }
}

#Preview {
    NavigationStack {
        BrowseSubjectsView()
            .environmentObject(ModelHealthClient(serviceProvider: MockModelHealthProvider()))
    }
}
