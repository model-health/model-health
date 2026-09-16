import Foundation
import ModelHealth

/// Reads one list, a piece at a time, and keeps what a browse screen needs to draw.
///
/// The sequence itself lives here rather than in a `@State` value because it has a lifetime:
/// it holds what it reads from until it is let go, and letting go has to happen somewhere
/// definite. When the screen disappears this object goes with it, and the sequence with that.
@MainActor
final class BrowseModel<List: BrowsableList>: ObservableObject {
    enum ReadingState {
        case notStarted
        case open
        case exhausted
        case failed
    }

    @Published private(set) var items: [List.Element] = []
    /// How many match, read once when the sequence opens and kept.
    @Published private(set) var total: Int?
    @Published private(set) var state: ReadingState = .notStarted
    @Published private(set) var isBusy = false
    @Published private(set) var errorMessage: String?

    private var list: List?
    private var iterator: List.AsyncIterator?

    var canRead: Bool {
        state == .open && !isBusy
    }

    /// Opens a fresh sequence, asks how many match, and reads the first batch.
    func open(step: Int, _ make: () -> List) async {
        let list = make()
        self.list = list
        iterator = list.makeAsyncIterator()
        items = []
        total = nil
        errorMessage = nil
        state = .open

        // Busy for the count too, not just for the items: without this the screen claims
        // "nothing matches" for as long as the count takes to come back.
        isBusy = true
        await readTotal()
        isBusy = false

        await loadMore(step)
    }

    /// How many match, which a list reports without being read through.
    private func readTotal() async {
        guard let list else {
            return
        }

        do {
            total = try await list.total
        } catch let error as ModelHealthError {
            errorMessage = error.message
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Pulls at most `count` items out of the sequence, one at a time.
    func loadMore(_ count: Int) async {
        guard canRead, var iterator else {
            return
        }

        isBusy = true
        errorMessage = nil
        defer { isBusy = false }

        var batch: [List.Element] = []
        var reachedEnd = false

        do {
            while batch.count < count {
                guard let item = try await iterator.next() else {
                    reachedEnd = true
                    break
                }

                batch.append(item)
            }
        } catch let error as ModelHealthError {
            finish(batch: batch, failure: error.message)
            return
        } catch {
            finish(batch: batch, failure: error.localizedDescription)
            return
        }

        self.iterator = iterator
        items.append(contentsOf: batch)
        state = reachedEnd ? .exhausted : .open
    }

    private func finish(batch: [List.Element], failure: String) {
        items.append(contentsOf: batch)
        state = .failed
        errorMessage = failure
    }
}
