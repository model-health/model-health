import Foundation
import Testing
import ModelHealth

/// Shared utilities and helpers for integration tests
enum TestHelpers {
    /// Creates and authenticates a ModelHealthService instance for testing
    static func createAuthenticatedService() async throws -> ModelHealthService {
        let service = try ModelHealthService()
        let config = TestConfig.shared

        let loginResult = try await service.login(
            username: config.credentials.username,
            password: config.credentials.password
        )

        // Handle verification if required
        if case .verificationRequired = loginResult {
            throw TestError.verificationRequired(
                "Test account requires email verification. " +
                "Please verify the test account or use a trusted device."
            )
        }

        // Verify we're actually authenticated
        let isAuthenticated = await service.isAuthenticated()
        #expect(isAuthenticated, "Service should be authenticated after login")

        return service
    }

    /// Validates that a Session matches expected test data
    static func validateSession(_ session: Session) {
        let expected = TestConfig.shared.expectedSession

        #expect(session.id == expected.id)
        #expect(session.user == expected.user)
        #expect(session.public == expected.public)
        #expect(session.name == expected.name)
        #expect(session.sessionName == expected.sessionName)
        #expect(session.subject == expected.subject)
        #expect(session.activitiesCount == expected.activitiesCount)
    }

    /// Validates that a Subject matches expected test data
    static func validateSubject(_ subject: Subject) {
        let expected = TestConfig.shared.expectedSubject

        #expect(subject.id == expected.id)
        #expect(subject.name == expected.name)
        #expect(subject.weight == expected.weight)
        #expect(subject.height == expected.height)
        #expect(subject.age == expected.age)
        #expect(subject.birthYear == expected.birthYear)
        #expect(subject.gender == expected.genderEnum)
        #expect(subject.sexAtBirth == expected.sexAtBirthEnum)
        #expect(subject.characteristics == expected.characteristics)
        #expect(subject.subjectTags == expected.subjectTags)
    }

    /// Validates that an Activity matches expected test data
    static func validateActivity(_ activity: Activity) {
        let expected = TestConfig.shared.expectedActivity

        #expect(activity.id == expected.id)
        #expect(activity.session == expected.session)
        #expect(activity.name == expected.name)
        #expect(activity.status == expected.status)
        #expect(activity.videos.count == expected.videoCount)
        #expect(activity.results.count == expected.resultCount)
    }

    /// Validates basic type correctness for a Session without checking specific values
    static func validateSessionStructure(_ session: Session) {
        // Verify all required fields are present and have correct types
        #expect(!session.id.isEmpty)
        #expect(session.user > 0)
        #expect(!session.name.isEmpty)
        #expect(!session.sessionName.isEmpty)
        #expect(session.activitiesCount >= 0)

        // Activities array should be present (can be empty)
        #expect(session.activities.count >= 0)
    }

    /// Validates basic type correctness for a Subject without checking specific values
    static func validateSubjectStructure(_ subject: Subject) {
        #expect(subject.id > 0)
        #expect(!subject.name.isEmpty)
        #expect(subject.characteristics.count >= 0)
        #expect(subject.subjectTags.count >= 0)

        // If optional fields are present, validate they're reasonable
        if let weight = subject.weight {
            #expect(weight > 0)
        }
        if let height = subject.height {
            #expect(height > 0)
        }
        if let age = subject.age {
            #expect(age >= 0)
        }
        if let birthYear = subject.birthYear {
            #expect(birthYear > 1900 && birthYear <= 2100)
        }
    }

    /// Validates basic type correctness for an Activity without checking specific values
    static func validateActivityStructure(_ activity: Activity) {
        #expect(!activity.id.isEmpty)
        #expect(!activity.session.isEmpty)
        #expect(!activity.status.isEmpty)
        #expect(activity.videos.count >= 0)
        #expect(activity.results.count >= 0)
    }
}

/// Custom errors for test suite
enum TestError: Error, CustomStringConvertible {
    case verificationRequired(String)
    case dataNotFound(String)
    case validationFailed(String)

    var description: String {
        switch self {
        case .verificationRequired(let message):
            return "Verification Required: \(message)"
        case .dataNotFound(let message):
            return "Data Not Found: \(message)"
        case .validationFailed(let message):
            return "Validation Failed: \(message)"
        }
    }
}
