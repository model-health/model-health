import Foundation
import ModelHealth

/// Configuration for integration tests loaded from shared test-config.json
struct TestConfig: Codable {
    let credentials: Credentials
    let knownIds: KnownIds
    let expectedSession: ExpectedSession
    let expectedSubject: ExpectedSubject
    let expectedActivity: ExpectedActivity
    let activityRetrieval: ActivityRetrieval

    struct Credentials: Codable {
        let username: String
        let password: String
    }

    struct KnownIds: Codable {
        let session: String
        let subject: Int
        let activity: String
    }

    struct ExpectedSession: Codable {
        let id: String
        let user: Int
        let `public`: Bool
        let name: String
        let sessionName: String
        let subject: Int?
        let activitiesCount: Int
    }

    struct ExpectedSubject: Codable {
        let id: Int
        let name: String
        let weight: Double?
        let height: Double?
        let age: Int?
        let birthYear: Int?
        let gender: String
        let sexAtBirth: String
        let characteristics: String
        let subjectTags: [String]

        var genderEnum: Subject.Gender {
            Subject.Gender.from(string: gender)
        }

        var sexAtBirthEnum: Subject.Sex {
            Subject.Sex.from(string: sexAtBirth)
        }
    }

    struct ExpectedActivity: Codable {
        let id: String
        let session: String
        let name: String?
        let status: String
        let videoCount: Int
        let resultCount: Int
    }

    struct ActivityRetrieval: Codable {
        let testSubjectId: String
        let expectedMinimumActivityCount: Int
        let startIndex: Int
        let count: Int
        let sortBy: String

        var sortByEnum: ActivitySort {
            .updatedAt
        }
    }

    /// Shared configuration instance loaded from test-config.json
    static let shared: TestConfig = {
        let currentFile = URL(fileURLWithPath: #file)
        let testsDir = currentFile.deletingLastPathComponent()
        let swiftDir = testsDir.deletingLastPathComponent().deletingLastPathComponent()
        let testConfigRoot = swiftDir.deletingLastPathComponent().appendingPathComponent("test")
        let configURL = testConfigRoot.appendingPathComponent("test-config.json")

        guard let data = try? Data(contentsOf: configURL) else {
            fatalError("""
                Could not load test-config.json from \(configURL.path)
                
                Please ensure test-config.json exists in the repository root.
                """)
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        do {
            let config = try decoder.decode(TestConfig.self, from: data)
            return config
        } catch let error {
            print(error)
            fatalError("Could not decode test-config.json. Please check the JSON format.")
        }
    }()
}

// MARK: - Helper Extensions for String to Enum Conversion

extension Subject.Gender {
    static func from(string: String) -> Subject.Gender {
        switch string.lowercased() {
        case "woman":
            return .woman

        case "man":
            return .man

        case "transgender":
            return .transgender

        case "non_binary", "nonbinary":
            return .nonBinary

        default:
            return .noResponse
        }
    }
}

extension Subject.Sex {
    static func from(string: String) -> Subject.Sex {
        switch string.lowercased() {
        case "woman":
            return .woman

        case "man":
            return .man

        case "intersex":
            return .intersex

        case
            "not_listed": return .notListed

        default:
            return .noResponse
        }
    }
}
