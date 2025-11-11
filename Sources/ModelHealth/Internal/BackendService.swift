import Foundation

extension Trial: ISODateDecodable {
}

extension Video: ISODateDecodable {
}

extension Result: ISODateDecodable {
}

protocol BackendService {
    func login(username: String,password: String) async throws -> LoginResult
    func verify(code: String, rememberDevice: Bool) async throws
    func subjectList() async throws -> [Subject]
    func trialList() async throws -> [Trial]
    func videoList() async throws -> [Video]
    func createSession() async throws -> Session
    func calibrateCamera(_ session: Session, checkerboardDetails: CheckerboardDetails) async throws
    func calibrateNeutralPose(for subject: Subject, in session: Session, statusUpdate: @Sendable (CalibrationStatus) -> Void) async throws
    func recordTrial(for subject: Subject, in session: Session, named name: String) async throws -> Trial
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

        let _: Trial = try await URLSession.shared.decode(from: calibrationRequest)

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

    func calibrateNeutralPose(
        for subject: Subject,
        in session: Session,
        statusUpdate: @Sendable (CalibrationStatus) -> Void
    ) async throws {
        guard let token else {
            throw URLError(.userAuthenticationRequired)
        }

        //        let metadataRequest = URLRequest.get(
        //            Backend.setMetadata(id: session.id),
        //            token: token,
        //            parameters: [
        //                "settings_data_sharing": settings.dataSharing,
        //                "settings_scaling_setup": settings.scalingSetup,
        //                "settings_framerate": String(settings.framerate),
        //                "settings_session_name": settings.sessionName ?? "",
        //                "settings_openSimModel": settings.openSimModel,
        //                "settings_augmenter_model": settings.augmenterModel,
        //                "settings_filter_frequency": settings.filterFrequency
        //            ]
        //        )
        //
        //        let _: Session = try await URLSession.shared.decode(from: metadataRequest)

        let subjectRequest = URLRequest.get(
            Backend.setSubject(id: session.id),
            token: token,
            parameters: ["subject_id": "\(subject.id)"]
        )

        let _: Session = try await URLSession.shared.decode(from: subjectRequest)

        let recordingRequest = URLRequest.get(
            Backend.startRecording(id: session.id),
            token: token,
            parameters: [
                "name": "neutral",
                "subject_id": "\(subject.id)"
            ]
        )
        
        let trial: Trial = try await URLSession.shared.decode(from: recordingRequest)

        let neutralImgRequest = URLRequest.get(
            Backend.neutralImg(id: session.id),
            token: token
        )

        while true {
            let response: NeutralImgResponse = try await URLSession.shared.decode(from: neutralImgRequest)

            switch response.status {
            case .done:
                statusUpdate(.done)
                return

            case .error:
                // TODO: Introduce correct error handling
                throw URLError(.unknown)

            case .recording:
                statusUpdate(.recording)

            case .uploading:
                let statusRequest = URLRequest.get(
                    Backend.sessionStatus(id: session.id),
                    token: token,
                    parameters: ["device_id": DeviceIdentifier.getDeviceIdentifier()]
                )

                let sessionStatus: SessionStatus = try await URLSession.shared.decode(from: statusRequest)

                statusUpdate(
                    .uploading(
                        uploaded: sessionStatus.nVideosUploaded,
                        total: sessionStatus.nCamerasConnected
                    )
                )

            case .processing:
                statusUpdate(.processing(percent: response.progressInfo?.percent))

            default:
                break
            }

            try await Task.sleep(for: .seconds(1))
        }
    }

    func recordTrial(for subject: Subject, in session: Session, named name: String) async throws -> Trial {
        guard let token else {
            throw URLError(.userAuthenticationRequired)
        }

        return Trial(
            id: "",
            session: session.id,
            name: name,
            status: "recording",
            videos: [],
            results: [],
            createdAt: Date(),
            updatedAt: Date(),
            server: "",
            isDocker: false,
            hostname: "",
            processedDuration: "0:00",
            processedCount: 0,
            gitCommit: "",
            trashed: false,
            trashedAt: nil
        )
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

    static var snakeCaseWithISO8601: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateString = try container.decode(String.self)

            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

            if let date = formatter.date(from: dateString) {
                return date
            }

            formatter.formatOptions = [.withInternetDateTime]
            if let date = formatter.date(from: dateString) {
                return date
            }

            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Cannot decode date string \(dateString)"
            )
        }

        return decoder    }
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

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            print("Decoding error: \(error.localizedDescription)")
            print("Response data: \(String(data: data, encoding: .utf8) ?? "N/A")")
            throw error
        }
    }

    func decode<T: SimpleDateDecodable>(
        from request: URLRequest
    ) async throws -> T {
        try await decode(from: request, using: .snakeCaseWithSimpleDate)
    }

    func decode<T: ISODateDecodable>(
        from request: URLRequest
    ) async throws -> T {
        try await decode(from: request, using: .snakeCaseWithISO8601)
    }
}
