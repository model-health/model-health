import Foundation

// For testing, use mock network service like this
//
// let mock = MockNetworkService()
// mock.stubbedDecodables["RegisterResponse"] = RegisterResponse(token: "test-token")
//
// let provider = ModelHealthProviderImpl(networkService: mock)
// try await provider.register(parameters: params)
actor MockNetworkService: NetworkService {
    var stubbedDecodables: [String: Any] = [:]
    var stubbedError: Error?
    var capturedRequests: [URLRequest] = []

    func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        fatalError("Use decode instead")
    }

    func decode<T: Decodable>(
        from request: URLRequest,
        using decoder: JSONDecoder = .snakeCase
    ) async throws -> T {
        capturedRequests.append(request)

        if let error = stubbedError {
            throw error
        }

        let key = String(describing: T.self)
        guard let stub = stubbedDecodables[key] as? T else {
            fatalError("No stub for \(key)")
        }

        return stub
    }
}
