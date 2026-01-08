import Foundation
import Testing
import ModelHealth

/// Integration tests for authentication operations.
///
/// Tests login, logout, and authentication state management against a real backend.
@Suite("Authentication Integration Tests", .serialized)
struct AuthenticationTests {

    @Test("IsAuthenticated returns true after successful login")
    func testAuthenticatedAfterLogin() async throws {
        let service = try ModelHealthService()
        let config = TestConfig.shared

        _ = try await service.login(
            username: config.credentials.username,
            password: config.credentials.password
        )

        let isAuthenticated = await service.isAuthenticated()
        #expect(isAuthenticated)
    }

    @Test("Logout clears authentication state")
    func testLogoutClearsAuth() async throws {
        let service = try ModelHealthService()
        let config = TestConfig.shared

        _ = try await service.login(
            username: config.credentials.username,
            password: config.credentials.password
        )

        var isAuthenticated = await service.isAuthenticated()
        #expect(isAuthenticated)

        try await service.logout()

        isAuthenticated = await service.isAuthenticated()
        #expect(!isAuthenticated)
    }

    @Test("Can login again after logout")
    func testLoginAfterLogout() async throws {
        let service = try ModelHealthService()
        let config = TestConfig.shared

        _ = try await service.login(
            username: config.credentials.username,
            password: config.credentials.password
        )

        try await service.logout()

        let result = try await service.login(
            username: config.credentials.username,
            password: config.credentials.password
        )

        #expect(result == .ok)

        let isAuthenticated = await service.isAuthenticated()
        #expect(isAuthenticated)
    }
}
