import SwiftUI
import ModelHealth

/// Subject groups — named collections of subjects.
struct BrowseGroupsView: View {
    @EnvironmentObject private var modelHealth: ModelHealthClient
    @StateObject private var model = BrowseModel<GroupStream>()

    @State private var search = ""
    @State private var order: GroupOrderBy = .name

    private let orders: [(String, GroupOrderBy)] = [
        ("Name A–Z", .name),
        ("Name Z–A", .nameDescending)
    ]

    var body: some View {
        BrowseScreen(model: model, title: "Subject groups", apply: { Task { await apply() } }, rowID: \.id) {
            BrowseFilters {
                TextField("Search by name", text: $search)
                    .textFieldStyle(.roundedBorder)

                Picker("Order", selection: $order) {
                    ForEach(orders, id: \.1.rawValue) { name, value in
                        Text(name).tag(value)
                    }
                }
            }
        } row: { group in
            BrowseGroupRow(group: group)
        }
        .task {
            if case .notStarted = model.state {
                await apply()
            }
        }
    }
}

private extension BrowseGroupsView {
    func apply() async {
        await model.open(step: browseLoadStep) {
            modelHealth.groups.list(
                search: search.isEmpty ? nil : search,
                orderBy: order
            )
        }
    }
}

struct BrowseGroupRow: View {
    let group: SubjectGroup

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(group.name)
                .font(.subheadline)

            HStack(spacing: 8) {
                Text("\(group.subjectCount) subjects")
                Text("\(group.totalActivities) activities")
                Spacer()
                Text(BrowseFormat.day(group.lastActivity))
            }
            .font(.caption)
            .foregroundColor(.secondary)
        }
    }
}

#Preview {
    NavigationStack {
        BrowseGroupsView()
            .environmentObject(ModelHealthClient(serviceProvider: MockModelHealthProvider()))
    }
}
