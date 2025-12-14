import Foundation

protocol NetworkService: Sendable {
    func data(from url: URL) async throws -> (Data, URLResponse)

    func data(for request: URLRequest) async throws -> (Data, URLResponse)

    func decode<T: Decodable>(
        from request: URLRequest,
        using decoder: JSONDecoder
    ) async throws -> T

    func decode<T: SimpleDateDecodable>(from request: URLRequest) async throws -> T
}

extension NetworkService {
    func decode<T: Decodable>(
        from request: URLRequest,
        using decoder: JSONDecoder = .snakeCase
    ) async throws -> T {
        let (data, response) = try await self.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw ModelHealthError.url(.badServerResponse)
        }

        switch httpResponse.statusCode {
        case 200...299:
            break

        case 400...499:
            throw ModelHealthError.http(
                .clientError(statusCode: httpResponse.statusCode)
            )

        case 500...599:
            throw ModelHealthError.http(
                .serverError(statusCode: httpResponse.statusCode)
            )

        default:
            throw ModelHealthError.http(
                .unexpectedStatusCode(statusCode: httpResponse.statusCode)
            )
        }

        guard !data.isEmpty else {
            throw ModelHealthError.url(.zeroByteResource)
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw ModelHealthError.unexpectedResponse
        }
    }

    func decode<T: SimpleDateDecodable>(from request: URLRequest) async throws -> T {
        try await decode(from: request, using: .snakeCaseWithSimpleDate)
    }

    func download(urls: [URL]) async -> [Data] {
        await withTaskGroup(of: Data?.self) { group in
            urls.forEach { url in
                group.addTask {
                    try? await URLSession.shared.data(from: url).0
                }
            }

            return await group.reduce(into: []) { result, data in
                if let data {
                    result.append(data)
                }
            }
        }
    }
}

struct URLSessionNetworkService: NetworkService {
    private let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    func data(from url: URL) async throws -> (Data, URLResponse) {
        try await session.data(from: url)
    }

    func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        try await session.data(for: request)
    }
}

extension JSONDecoder {
    static var snakeCase: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        return decoder
    }

    static var snakeCaseWithSimpleDate: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        decoder.dateDecodingStrategy = .formatted(formatter)

        return decoder
    }
}
