import Foundation

protocol BackendService {
    func login(username: String,password: String) async throws -> LoginResult
    func verify(code: String, rememberDevice: Bool) async throws
    func subjectList() async throws -> [Subject]
    func trialList() async throws -> [Trial]
    func videoList() async throws -> [Video]
    func createSession() async throws -> Session
    func calibrateCamera(_ session: Session, checkerboardDetails: CheckerboardDetails) async throws
    func calibrateNeutralPose() async throws
    func recordTrial(named name: String) async throws
    func stopRecording(trialId: String) async throws
    func fetchAnalysis(trialId: String) async throws -> Data
}

actor BackendServiceImpl: BackendService {
    private var token: String?

    func login(username: String,password: String) async throws -> LoginResult {
        let request = URLRequest.post(
            Backend.login,
            body: ["username": username, "password": password]
        )

        let loginResponse: LoginResponse = try await URLSession.shared.decode(from: request)
        token = loginResponse.token

        return loginResponse.otpChallengeSent ? .verificationRequired : .ok
    }

    func verify(code: String, rememberDevice: Bool = false) async throws {
        guard let token else {
            throw URLError(.userAuthenticationRequired)
        }

        let request = URLRequest.post(
            Backend.verify,
            token: token,
            body: ["otp_token": code, "remember_device": rememberDevice ? "true" : "false"]
        )

        let _: EmptyResponse = try await URLSession.shared.decode(from: request)
    }

    func subjectList() async throws -> [Subject] {
        let response: SubjectsResponse = try await get(Backend.subjects)
        return response.subjects
    }

    func trialList() async throws -> [Trial] {
        let response: TrialsResponse = try await get(Backend.trials)
        return response.trials
    }

    func videoList() async throws -> [Video] {
        let response: VideosResponse = try await get(Backend.videos)
        return response.videos
    }

    func createSession() async throws -> Session {
        let response: [Session] = try await get(Backend.createSession)

        guard let session = response.first else {
            throw URLError(.badServerResponse)
        }

        return session
    }

    func calibrateCamera(_ session: Session, checkerboardDetails: CheckerboardDetails) async throws {
        guard let token else {
            throw URLError(.userAuthenticationRequired)
        }

        let request = URLRequest.patch(
            Backend.session(session.id),
            token: token,
            body: [
                "meta": [
                    "sessionName": "iOS SDK test",
                    "checkerboard": [
                        "rows": String(checkerboardDetails.rows),
                        "cols": String(checkerboardDetails.columns),
                        "square_size": String(checkerboardDetails.squareSize),
                        "placement": checkerboardDetails.placement.rawValue.capitalized
                    ]
                ]
            ]
        )

        let patchedSession: Session = try await URLSession.shared.decode(from: request)

        guard patchedSession.id == session.id else {
            throw URLError(.badServerResponse)
        }

        let calibrationRequest = URLRequest.get(
            Backend.startRecording(id: session.id),
            token: token,
            parameters: ["name": "calibration"]
        )

        let _: Session = try await URLSession.shared.decode(from: calibrationRequest)

        let calibrationImgRequest = URLRequest.get(
            Backend.calibrationImg(id: session.id),
            token: token
        )

        let sessionStatusRequest = URLRequest.get(
            Backend.sessionStatus(id: session.id),
            token: token,
            parameters: ["device_id": DeviceIdentifier.getDeviceIdentifier()]
        )

        async let _: CalibrationImgResponse = try await URLSession.shared.decode(from: calibrationImgRequest)
        async let _: SessionStatus = try await URLSession.shared.decode(from: sessionStatusRequest)
    }

    func calibrateNeutralPose() async throws {
        guard let token else {
            throw URLError(.userAuthenticationRequired)
        }

    }

    func recordTrial(named name: String) async throws {
        guard let token else {
            throw URLError(.userAuthenticationRequired)
        }

    }

    func stopRecording(trialId: String) async throws {
        guard let token else {
            throw URLError(.userAuthenticationRequired)
        }

        let _: SessionStatus = try await get(Backend.stopRecording(id: trialId))
    }

    func fetchAnalysis(trialId: String) async throws -> Data {
        guard let token else {
            throw URLError(.userAuthenticationRequired)
        }

        return Data()
    }
}

extension BackendServiceImpl {
    private func get<T: Decodable & Sendable>(_ url: URL) async throws -> T {
        guard let token else {
            throw URLError(.userAuthenticationRequired)
        }

        let request = URLRequest.get(url, token: token)
        return try await URLSession.shared.decode(from: request)
    }
}

private extension URLRequest {
    static func request(
        _ url: URL,
        httpMethod: HTTPMethod,
        token: String? = nil,
        body: [String: Any]? = nil,
        parameters: [String: String]? = nil
    ) -> URLRequest {
        var request = URLRequest(url: url)
        request.httpMethod = httpMethod.name
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        token.map {
            request.setValue("Token \($0)", forHTTPHeaderField: "Authorization")
        }

        body.map {
            request.httpBody = try? JSONSerialization.data(withJSONObject: $0)
        }

        if let parameters {
            var components = URLComponents(url: url, resolvingAgainstBaseURL: false)
            components?.queryItems = parameters.map { key, value in
                URLQueryItem(name: key, value: value)
            }

            if let urlWithParams = components?.url {
                request.url = urlWithParams
            }
        }

        return request
    }

    static func get(
        _ url: URL,
        token: String? = nil,
        parameters: [String: String]? = nil
    ) -> URLRequest {
        request(
            url,
            httpMethod: .get,
            token: token,
            parameters: parameters
        )
    }

    static func post(
        _ url: URL,
        token: String? = nil,
        body: [String: Any]? = nil,
        parameters: [String: String]? = nil
    ) -> URLRequest {
        request(
            url,
            httpMethod: .post,
            token: token,
            body: body,
            parameters: parameters
        )
    }

    static func patch(
        _ url: URL,
        token: String? = nil,
        body: [String: Any]? = nil,
        parameters: [String: String]? = nil
    ) -> URLRequest {
        request(
            url,
            httpMethod: .patch,
            token: token,
            body: body,
            parameters: parameters
        )
    }
}

// MARK: - Configured Decoder
extension JSONDecoder {
    static var snakeCase: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        decoder.dateDecodingStrategy = .formatted(formatter)

        return decoder
    }
}

// MARK: - URLSession Extension
extension URLSession {
    func decode<T: Decodable>(
        from request: URLRequest,
        using decoder: JSONDecoder = .snakeCase
    ) async throws -> T {
        let (data, response) = try await self.data(for: request)

        guard
            let httpResponse = response as? HTTPURLResponse,
            (200...299).contains(httpResponse.statusCode)
        else {
            throw URLError(.badServerResponse)
        }

        guard !data.isEmpty else {
            throw URLError(.zeroByteResource)
        }

        return try decoder.decode(T.self, from: data)
    }
}
