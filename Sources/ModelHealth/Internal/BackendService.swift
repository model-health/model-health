import Foundation

extension Session: ISODateDecodable {
}

extension Trial: ISODateDecodable {
}

extension Video: ISODateDecodable {
}

extension Result: ISODateDecodable {
}

extension CheckerboardDetails {
    var parameters: [String: String] {
        [
            "cb_rows": String(rows),
            "cb_cols": String(columns),
            "cb_square": String(squareSize),
            "cb_placement": placement.rawValue.capitalized
        ]
    }
}

protocol BackendService {
    func login(username: String,password: String) async throws -> LoginResult
    func verify(code: String, rememberDevice: Bool) async throws
    func subjectList() async throws -> [Subject]
    func trialList() async throws -> [Trial]
    func videoList() async throws -> [Video]
    func createSession() async throws -> Session
    func recordTrial(for subject: Subject, in session: Session, named name: String) async throws -> Trial
    func stopRecording(trialId: String) async throws
    func fetchAnalysis(trialId: String) async throws -> Data

    func calibrateCamera(
        _ session: Session,
        checkerboardDetails: CheckerboardDetails,
        statusUpdate: @Sendable (CalibrationStatus) -> Void
    ) async throws

    func calibrateNeutralPose(
        for subject: Subject,
        in session: Session,
        statusUpdate: @Sendable (CalibrationStatus) -> Void
    ) async throws
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

    func calibrateCamera(
        _ session: Session,
        checkerboardDetails: CheckerboardDetails,
        statusUpdate: @Sendable (CalibrationStatus) -> Void
    ) async throws {
        guard let token else {
            throw URLError(.userAuthenticationRequired)
        }

        let metadataRequest = URLRequest.get(
            Backend.setMetadata(id: session.id),
            token: token,
            parameters: checkerboardDetails.parameters
        )

        let _: Session = try await URLSession.shared.decode(from: metadataRequest)

        let calibrationRequest = URLRequest.get(
            Backend.startRecording(id: session.id),
            token: token,
            parameters: ["name": "calibration"]
        )

        let trial: Trial = try await URLSession.shared.decode(from: calibrationRequest)

        let calibrationImgRequest = URLRequest.get(
            Backend.calibrationImg(id: session.id),
            token: token
        )

        while true {
            let response: CalibrationImgResponse = try await URLSession.shared.decode(from: calibrationImgRequest)

            let sessionStatusRequest = URLRequest.get(
                Backend.sessionStatus(id: session.id),
                token: token,
                parameters: ["device_id": DeviceIdentifier.getDeviceIdentifier()]
            )

            let sessionStatus: SessionStatusResponse = try await URLSession.shared.decode(from: sessionStatusRequest)
            print("session status: \(sessionStatus.status)")

            switch response.status {
            case .done:
                let calibratedRequest = URLRequest.get(
                    Backend.calibratedCameras(id: session.id),
                    token: token
                )

                let calibratedResponse: CalibratedCamerasResponse = try await URLSession.shared.decode(from: calibratedRequest)
                print("Calibrated cameras: \(calibratedResponse.data)")

                guard calibratedResponse.data >= 1 else {
                    // TODO: Introduce correct error handling
                    throw URLError(.unknown)
                }

                statusUpdate(.done)
                return

            case .error:
                // TODO: Introduce correct error handling
                throw URLError(.unknown)

            default:
                let trialRequest = URLRequest.get(
                    Backend.trial(id: trial.id),
                    token: token
                )

                let trialStatus: Trial = try await URLSession.shared.decode(from: trialRequest)

                print("Trial status: \(trialStatus.status)")

                if trialStatus.status == "stopped" || trialStatus.status == "processing" {
                    let isUploadingVideos = trialStatus.videos.contains { $0.video == nil }

                    if isUploadingVideos {
                        statusUpdate(
                            .uploading(
                                uploaded: sessionStatus.nVideosUploaded,
                                total: sessionStatus.nCamerasConnected
                            )
                        )
                    } else {
                        statusUpdate(.processing(percent: nil))
                    }
                }
            }

            try await Task.sleep(for: .seconds(1))
        }
    }

    func calibrateNeutralPose(
        for subject: Subject,
        in session: Session,
        statusUpdate: @Sendable (CalibrationStatus) -> Void
    ) async throws {
        guard let token else {
            throw URLError(.userAuthenticationRequired)
        }

        let metadataRequest = URLRequest.get(
            Backend.setMetadata(id: session.id),
            token: token,
            parameters: [
                "settings_data_sharing": "Share no data",
                "settings_scaling_setup": "any_pose",
                "settings_framerate": "60",
                "settings_session_name": session.name,
                "settings_openSimModel": "LaiUhlrich2022",
                "settings_augmenter_model": "v0.3",
                "settings_filter_frequency": "default"
            ]
        )
        
        let _: Session = try await URLSession.shared.decode(from: metadataRequest)

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

            default:
                let trialRequest = URLRequest.get(
                    Backend.trial(id: trial.id),
                    token: token
                )

                let trialStatus: Trial = try await URLSession.shared.decode(from: trialRequest)

                if trialStatus.status == "stopped" || trialStatus.status == "processing" {
                    let isUploadingVideos = trialStatus.videos.contains { $0.video == nil }

                    if isUploadingVideos {
                        let sessionStatusRequest = URLRequest.get(
                            Backend.sessionStatus(id: session.id),
                            token: token
                        )
                        let sessionStatus: SessionStatusResponse = try await URLSession.shared.decode(from: sessionStatusRequest)

                        statusUpdate(
                            .uploading(
                                uploaded: sessionStatus.nVideosUploaded,
                                total: sessionStatus.nCamerasConnected
                            )
                        )
                    } else if trialStatus.results.isEmpty {
                        statusUpdate(.processing(percent: response.progressInfo?.percent))
                    }
                }
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
            processedCount: 0
        )
    }

    func stopRecording(trialId: String) async throws {
        guard let token else {
            throw URLError(.userAuthenticationRequired)
        }

        let _: SessionStatusResponse = try await get(Backend.stopRecording(id: trialId))
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
