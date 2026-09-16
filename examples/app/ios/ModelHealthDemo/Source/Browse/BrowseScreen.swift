import SwiftUI
import ModelHealth

/// How many items each read pulls out of the sequence.
let browseLoadStep = 25

/// The parts every browse screen shares: how many match, how many have been read, and a list
/// that reads on as it is scrolled. Each screen supplies its own filters and its own row.
struct BrowseScreen<List: BrowsableList, ID: Hashable, Filters: View, Row: View>: View {
    @ObservedObject var model: BrowseModel<List>
    let title: String
    let apply: () -> Void
    let rowID: KeyPath<List.Element, ID>
    @ViewBuilder let filters: () -> Filters
    @ViewBuilder let row: (List.Element) -> Row

    @State private var showingFilters = false

    var body: some View {
        VStack(spacing: 0) {
            // The filters live in a sheet of their own. There are more of them than fit above a
            // list, and a short scrolling box would hide most of them behind a scroll nobody
            // can see.
            VStack(alignment: .leading, spacing: 8) {
                summary
            }
            .padding(.horizontal)
            .padding(.vertical, 8)

            Divider()

            results
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showingFilters = true
                } label: {
                    Label("Filters", systemImage: "line.3.horizontal.decrease.circle")
                }
            }
        }
        .sheet(isPresented: $showingFilters) {
            NavigationStack {
                Form {
                    filters()
                }
                .navigationTitle("Filters")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Cancel") { showingFilters = false }
                    }

                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Apply") {
                            showingFilters = false
                            apply()
                        }
                        .fontWeight(.semibold)
                    }
                }
            }
        }
    }
}

private extension BrowseScreen {
    @ViewBuilder
    var summary: some View {
        if model.total != nil || !model.items.isEmpty {
            HStack(spacing: 16) {
                Text("\(model.total.map(String.init) ?? "—") found")
                Text("\(model.items.count) shown")
            }
            .font(.caption.monospacedDigit())
            .foregroundColor(.secondary)
        }

        if let errorMessage = model.errorMessage {
            Text(errorMessage)
                .font(.caption)
                .foregroundColor(.red)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    @ViewBuilder
    var results: some View {
        if model.items.isEmpty {
            Spacer()
            emptyState
            Spacer()
        } else {
            SwiftUI.List {
                ForEach(model.items, id: rowID) { item in
                    row(item)
                        // The list is lazy, so the last row appears only when it is scrolled to.
                        // Reading more there is what makes the list continue on its own; a read
                        // that is already running, or a list already at its end, is declined by
                        // the model rather than guarded here.
                        .onAppear {
                            guard isLast(item) else {
                                return
                            }

                            Task { await model.loadMore(browseLoadStep) }
                        }
                }

                if model.isBusy {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                }
            }
            .listStyle(.plain)
        }
    }

    func isLast(_ item: List.Element) -> Bool {
        model.items.last.map { $0[keyPath: rowID] == item[keyPath: rowID] } ?? false
    }

    @ViewBuilder
    var emptyState: some View {
        if model.isBusy {
            ProgressView("Loading…")
        } else {
            VStack(spacing: 12) {
                Image(systemName: "line.3.horizontal.decrease.circle")
                    .font(.system(size: 44))
                    .foregroundColor(.gray.opacity(0.5))

                Text("Nothing matches this filter")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding()
        }
    }
}

/// The filters of one screen, as rows of the sheet they are presented in.
struct BrowseFilters<Content: View>: View {
    @ViewBuilder let content: () -> Content

    var body: some View {
        Section {
            content()
        }
    }
}

/// A date filter that can also be unset, which a plain `DatePicker` cannot express.
struct OptionalDateField: View {
    let label: String
    @Binding var isOn: Bool
    @Binding var date: Date

    var body: some View {
        HStack {
            Toggle(label, isOn: $isOn)
                .font(.subheadline)

            if isOn {
                DatePicker("", selection: $date, displayedComponents: .date)
                    .labelsHidden()
            }
        }
    }
}
