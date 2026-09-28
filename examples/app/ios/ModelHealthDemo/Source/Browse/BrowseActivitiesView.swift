import SwiftUI
import ModelHealth

/// Activities — the list with the most to filter by, and usually the only one long enough to
/// watch arrive a piece at a time.
struct BrowseActivitiesView: View {
    @EnvironmentObject private var modelHealth: ModelHealthClient
    @StateObject private var model = BrowseModel<ActivityStream>()

    @State private var subjects: [Subject] = []
    @State private var sessions: [Session] = []
    @State private var activityTypes: [ActivityTypeInfo] = []

    @State private var search = ""
    @State private var subjectID: Int?
    @State private var calibrationSessionID: String?
    @State private var activityTypeID: Int?
    @State private var tagsText = ""
    @State private var createdByText = ""
    @State private var order: ActivityOrderBy = .createdAtDescending
    @State private var onlyCompleted = false
    @State private var excludeCalibration = true
    @State private var excludeAnalysisError = false
    @State private var hasCreatedAfter = false
    @State private var createdAfter = Date()
    @State private var hasCreatedBefore = false
    @State private var createdBefore = Date()

    private let orders: [(String, ActivityOrderBy)] = [
        ("Newest first", .createdAtDescending),
        ("Oldest first", .createdAt),
        ("Status ↑", .status),
        ("Status ↓", .statusDescending),
        ("Type ↑", .activityType),
        ("Type ↓", .activityTypeDescending),
        ("Recorded by ↑", .createdBy),
        ("Recorded by ↓", .createdByDescending)
    ]

    var body: some View {
        BrowseScreen(model: model, title: "Activities", apply: { Task { await apply() } }, rowID: \.id) {
            BrowseFilters {
                TextField("Search by name", text: $search)
                    .textFieldStyle(.roundedBorder)

                Picker("Subject", selection: $subjectID) {
                    Text("Any subject").tag(Int?.none)
                    ForEach(subjects) { subject in
                        Text(subject.name).tag(Int?.some(subject.id))
                    }
                }

                Picker("Calibrated under", selection: $calibrationSessionID) {
                    Text("Any session").tag(String?.none)
                    ForEach(sessions) { session in
                        Text(session.name).tag(String?.some(session.id))
                    }
                }

                Picker("Type", selection: $activityTypeID) {
                    Text("Any type").tag(Int?.none)
                    ForEach(activityTypes, id: \.id) { type in
                        Text(type.displayName).tag(Int?.some(type.id))
                    }
                }

                OptionalDateField(label: "Recorded after", isOn: $hasCreatedAfter, date: $createdAfter)
                OptionalDateField(label: "Recorded before", isOn: $hasCreatedBefore, date: $createdBefore)

                TextField("Tags, comma separated", text: $tagsText)
                    .textFieldStyle(.roundedBorder)
                TextField("Account ids, comma separated", text: $createdByText)
                    .keyboardType(.numbersAndPunctuation)
                    .textFieldStyle(.roundedBorder)

                Toggle("Only finished analysis", isOn: $onlyCompleted)
                    .font(.subheadline)
                Toggle("Leave out calibration", isOn: $excludeCalibration)
                    .font(.subheadline)
                Toggle("Leave out failed analysis", isOn: $excludeAnalysisError)
                    .font(.subheadline)

                Picker("Order", selection: $order) {
                    ForEach(orders, id: \.1.rawValue) { name, value in
                        Text(name).tag(value)
                    }
                }
            }
        } row: { activity in
            BrowseActivityRow(activity: activity)
        }
        .task {
            if subjects.isEmpty {
                subjects = (try? await modelHealth.subjects.list().all()) ?? []
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

private extension BrowseActivitiesView {
    func apply() async {
        await model.open(step: browseLoadStep) {
            modelHealth.activities.list(
                subject: subjects.first { $0.id == subjectID },
                calibrationSession: sessions.first { $0.id == calibrationSessionID },
                activityType: activityTypes.first { $0.id == activityTypeID },
                excludeCalibration: excludeCalibration,
                createdAfter: hasCreatedAfter ? createdAfter : nil,
                createdBefore: hasCreatedBefore ? createdBefore : nil,
                search: search.isEmpty ? nil : search,
                tags: BrowseInput.list(tagsText),
                createdBy: BrowseInput.ids(createdByText),
                onlyCompleted: onlyCompleted,
                excludeAnalysisError: excludeAnalysisError,
                orderBy: order
            )
        }
    }
}

/// Turns a comma-separated field into what a filter expects, or nothing when it is empty.
enum BrowseInput {
    static func list(_ text: String) -> [String]? {
        let entries = text.split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
        return entries.isEmpty ? nil : entries
    }

    static func ids(_ text: String) -> [Int]? {
        let entries = (list(text) ?? []).compactMap(Int.init)
        return entries.isEmpty ? nil : entries
    }
}

struct BrowseActivityRow: View {
    let activity: Activity

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(activity.name ?? activity.id)
                .font(.subheadline)

            HStack(spacing: 8) {
                if let type = activity.activityType?.displayName {
                    Text(type)
                }
                Text(activity.analysisStatus ?? activity.status)
                Spacer()
                Text(BrowseFormat.day(activity.createdAt))
            }
            .font(.caption)
            .foregroundColor(.secondary)
        }
    }
}

enum BrowseFormat {
    private static let dayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    static func day(_ date: Date?) -> String {
        guard let date else {
            return "—"
        }

        return dayFormatter.string(from: date)
    }
}

#Preview {
    NavigationStack {
        BrowseActivitiesView()
            .environmentObject(ModelHealthClient(serviceProvider: MockModelHealthProvider()))
    }
}
