import Foundation
import Testing
import ModelHealth

/// Integration tests for CRUD operations.
///
/// Tests get(activity), update(activity), createSubject, and createSession.
@Suite("CRUD Integration Tests", .serialized)
struct CRUDTests {
    private var service: ModelHealthService!

    init() async throws {
        service = try await TestHelpers.createAuthenticatedService()
    }

    // MARK: - Get Activity Tests

    @Test("Get activity by ID returns correct activity")
    func testGetActivityById() async throws {
        let config = TestConfig.shared
        let activity = try await service.get(activity: config.knownIds.activity)

        TestHelpers.validateActivity(activity)
    }

    @Test("Get activity returns valid structure")
    func testGetActivityStructure() async throws {
        let config = TestConfig.shared
        let activity = try await service.get(activity: config.knownIds.activity)

        TestHelpers.validateActivityStructure(activity)
    }

    @Test("Get activity returns consistent data")
    func testGetActivityConsistency() async throws {
        let config = TestConfig.shared

        let activity1 = try await service.get(activity: config.knownIds.activity)
        let activity2 = try await service.get(activity: config.knownIds.activity)

        #expect(activity1.id == activity2.id)
        #expect(activity1.session == activity2.session)
        #expect(activity1.name == activity2.name)
        #expect(activity1.status == activity2.status)
    }

    // MARK: - Update Activity Tests

    @Test("Update activity modifies name field")
    func testUpdateActivityName() async throws {
        let config = TestConfig.shared

        var activity = try await service.get(activity: config.knownIds.activity)
        let originalName = activity.name

        let timestamp = ISO8601DateFormatter().string(from: Date())
        let newName = "Updated Test Activity - \(timestamp)"
        activity.name = newName

        let updatedActivity = try await service.update(activity: activity)

        #expect(updatedActivity.name == newName)
        #expect(updatedActivity.id == activity.id)
        #expect(updatedActivity.session == activity.session)

        activity.name = originalName
        _ = try await service.update(activity: activity)
    }

    @Test("Update activity preserves other fields")
    func testUpdateActivityPreservesFields() async throws {
        let config = TestConfig.shared
        var activity = try await service.get(activity: config.knownIds.activity)

        let originalId = activity.id
        let originalSession = activity.session
        let originalStatus = activity.status
        let originalVideosCount = activity.videos.count
        let originalResultsCount = activity.results.count

        activity.name = "Preserve Fields Test - \(Date().timeIntervalSince1970)"
        let updatedActivity = try await service.update(activity: activity)

        #expect(updatedActivity.id == originalId)
        #expect(updatedActivity.session == originalSession)
        #expect(updatedActivity.status == originalStatus)
        #expect(updatedActivity.videos.count == originalVideosCount)
        #expect(updatedActivity.results.count == originalResultsCount)
    }

    // MARK: - Create Subject Tests

    @Test("Create subject with valid parameters succeeds")
    func testCreateSubject() async throws {
        let timestamp = Int(Date().timeIntervalSince1970)
        let params = SubjectParameters(
            name: "Integration Test Subject \(timestamp)",
            weight: 72.5,
            height: 175.0,
            birthYear: 1995,
            subjectTags: ["integration-test", "auto-created"],
            sexAtBirth: .man,
            gender: .man,
            characteristics: "Created by integration test suite",
            terms: true
        )

        let subject = try await service.createSubject(parameters: params)

        #expect(subject.name == params.name)
        #expect(subject.weight == params.weight)
        #expect(subject.height == params.height)
        #expect(subject.birthYear == params.birthYear)
        #expect(subject.sexAtBirth == params.sexAtBirth)
        #expect(subject.gender == params.gender)
        #expect(subject.characteristics == params.characteristics)
        #expect(subject.subjectTags == params.subjectTags)

        #expect(subject.id > 0)
    }

    @Test("Create subject returns valid structure")
    func testCreateSubjectStructure() async throws {
        let timestamp = Int(Date().timeIntervalSince1970)
        let params = SubjectParameters(
            name: "Structure Test Subject \(timestamp)",
            weight: 80.0,
            height: 185.0,
            birthYear: 1990,
            subjectTags: ["test"],
            characteristics: "Test subject"
        )

        let subject = try await service.createSubject(parameters: params)
        TestHelpers.validateSubjectStructure(subject)
    }

    @Test("Created subject appears in subject list")
    func testCreatedSubjectInList() async throws {
        let timestamp = Int(Date().timeIntervalSince1970)
        let uniqueName = "List Test Subject \(timestamp)"

        let params = SubjectParameters(
            name: uniqueName,
            weight: 75.0,
            height: 180.0,
            birthYear: 1992,
            subjectTags: ["list-test"]
        )

        let createdSubject = try await service.createSubject(parameters: params)
        let subjects = try await service.subjectList()

        let foundSubject = subjects.first { $0.id == createdSubject.id }
        #expect(foundSubject != nil, "Created subject should appear in subject list")
        #expect(foundSubject?.name == uniqueName)
    }

    // MARK: - Create Session Tests

    @Test("Create session succeeds")
    func testCreateSession() async throws {
        let session = try await service.createSession()

        #expect(!session.id.isEmpty)
        #expect(session.user > 0)
        #expect(!session.name.isEmpty)
        #expect(!session.sessionName.isEmpty)
        #expect(session.activitiesCount == 0, "New session should have no activities")
        #expect(session.activities.isEmpty, "New session should have empty activities array")
    }

    @Test("Create session returns valid structure")
    func testCreateSessionStructure() async throws {
        let session = try await service.createSession()
        TestHelpers.validateSessionStructure(session)
    }

    @Test("Created session appears in session list")
    func testCreatedSessionInList() async throws {
        let createdSession = try await service.createSession()
        let sessions = try await service.sessionList()

        let foundSession = sessions.first { $0.id == createdSession.id }
        #expect(foundSession != nil, "Created session should appear in session list")
        #expect(foundSession?.id == createdSession.id)
    }

    @Test("Multiple session creates produce unique sessions")
    func testMultipleSessionCreates() async throws {
        let session1 = try await service.createSession()
        let session2 = try await service.createSession()

        #expect(session1.id != session2.id, "Each created session should have a unique ID")
    }
}
