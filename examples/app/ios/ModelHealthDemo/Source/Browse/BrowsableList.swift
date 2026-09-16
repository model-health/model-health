import ModelHealth

/// What every list the SDK returns can do, so one reader can drive any of them.
///
/// The four sequences already have these members; this only names the shape they share, which
/// `AsyncSequence` alone does not cover.
protocol BrowsableList: AsyncSequence {
    var total: Int { get async throws }
    func all() async throws -> [Element]
}

extension ActivityStream: BrowsableList {}
extension SubjectStream: BrowsableList {}
extension SessionStream: BrowsableList {}
extension GroupStream: BrowsableList {}
