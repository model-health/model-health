import Foundation
import Testing
import ModelHealth

/// Integration tests for data retrieval operations.
///
/// Tests sessionList, subjectList, and getActivities against a pre-populated test account.
@Suite("Data Retrieval Integration Tests", .serialized)
struct DataRetrievalTests {
    private var service: ModelHealthService!

    init() async throws {
        service = try await TestHelpers.createAuthenticatedService()
    }

    // MARK: - Session List Tests

    @Test("SessionList returns non-empty array")
    func testSessionListReturnsData() async throws {
        let sessions = try await service.sessionList()
        #expect(!sessions.isEmpty, "Test account should have at least one session")
    }

    @Test("SessionList contains expected test session")
    func testSessionListContainsKnownSession() async throws {
        let config = TestConfig.shared
        let sessions = try await service.sessionList()

        guard let testSession = sessions.first(where: { $0.id == config.knownIds.session }) else {
            throw TestError.dataNotFound("Known session with ID \(config.knownIds.session) not found")
        }

        TestHelpers.validateSession(testSession)
    }

    @Test("SessionList returns valid Session structures")
    func testSessionListStructure() async throws {
        let sessions = try await service.sessionList()

        for session in sessions {
            TestHelpers.validateSessionStructure(session)
        }
    }

    // MARK: - Subject List Tests

    @Test("SubjectList returns non-empty array")
    func testSubjectListReturnsData() async throws {
        let subjects = try await service.subjectList()

        #expect(!subjects.isEmpty, "Test account should have at least one subject")
    }

    @Test("SubjectList contains expected test subject")
    func testSubjectListContainsKnownSubject() async throws {
        let config = TestConfig.shared
        let subjects = try await service.subjectList()

        guard let testSubject = subjects.first(where: { $0.id == config.knownIds.subject }) else {
            throw TestError.dataNotFound("Known subject with ID \(config.knownIds.subject) not found")
        }

        TestHelpers.validateSubject(testSubject)
    }

    @Test("SubjectList returns valid Subject structures")
    func testSubjectListStructure() async throws {
        let subjects = try await service.subjectList()

        for subject in subjects {
            TestHelpers.validateSubjectStructure(subject)
        }
    }

    // MARK: - Get Activities Tests

    @Test("GetActivities returns activities for known subject")
    func testGetActivitiesReturnsData() async throws {
        let config = TestConfig.shared.activityRetrieval

        let activities = try await service.getActivities(
            forSubject: config.testSubjectId,
            startIndex: config.startIndex,
            count: config.count,
            sortedBy: config.sortByEnum
        )

        #expect(
            activities.count >= config.expectedMinimumActivityCount,
            "Subject should have at least \(config.expectedMinimumActivityCount) activities"
        )
    }

    @Test("GetActivities respects count parameter")
    func testGetActivitiesRespectsCount() async throws {
        let config = TestConfig.shared.activityRetrieval
        let requestCount = 3

        let activities = try await service.getActivities(
            forSubject: config.testSubjectId,
            startIndex: 0,
            count: requestCount,
            sortedBy: config.sortByEnum
        )

        #expect(
            activities.count <= requestCount,
            "Should return at most \(requestCount) activities"
        )
    }

    @Test("GetActivities returns valid Activity structures")
    func testGetActivitiesStructure() async throws {
        let config = TestConfig.shared.activityRetrieval

        let activities = try await service.getActivities(
            forSubject: config.testSubjectId,
            startIndex: config.startIndex,
            count: config.count,
            sortedBy: config.sortByEnum
        )

        for activity in activities {
            TestHelpers.validateActivityStructure(activity)
        }
    }

    @Test("GetActivities pagination works with startIndex")
    func testGetActivitiesPagination() async throws {
        let config = TestConfig.shared.activityRetrieval

        let firstPage = try await service.getActivities(
            forSubject: config.testSubjectId,
            startIndex: 0,
            count: 2,
            sortedBy: config.sortByEnum
        )

        let secondPage = try await service.getActivities(
            forSubject: config.testSubjectId,
            startIndex: 2,
            count: 2,
            sortedBy: config.sortByEnum
        )

        if firstPage.count == 2 && secondPage.count > 0 {
            let firstIds = Set(firstPage.map { $0.id })
            let secondIds = Set(secondPage.map { $0.id })

            #expect(
                firstIds.isDisjoint(with: secondIds),
                "Paginated results should not overlap"
            )
        }
    }
}
