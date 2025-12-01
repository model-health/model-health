import Foundation

actor ModelHealthProviderImpl: ModelHealthProvider {
    private let networkService: NetworkService

    private var token: String? {
        didSet {
            if let token {
                _ = KeychainHelper.save(token, for: .authToken)
            } else {
                KeychainHelper.delete(.authToken)
            }
        }
    }

    init(networkService: NetworkService = URLSessionNetworkService()) {
        self.networkService = networkService
        self.token = KeychainHelper.get(.authToken)
    }

    func register(parameters: RegistrationParameters) async throws {
        let request = URLRequest.post(
            Backend.register,
            body: parameters.body
        )

        let registerResponse: RegisterResponse = try await networkService.decode(from: request)
        token = registerResponse.token
    }

    func login(username: String, password: String) async throws -> LoginResult {
        let request = URLRequest.post(
            Backend.login,
            body: ["username": username, "password": password]
        )

        let loginResponse: LoginResponse = try await networkService.decode(from: request)
        token = loginResponse.token

        return loginResponse.otpChallengeSent ? .verificationRequired : .ok
    }

    func verify(code: String, rememberDevice: Bool = false) async throws {
        guard let token else {
            throw ModelHealthError.url(.userAuthenticationRequired)
        }

        let request = URLRequest.post(
            Backend.verify,
            token: token,
            body: ["otp_token": code, "remember_device": rememberDevice ? "true" : "false"]
        )

        let _: EmptyResponse = try await networkService.decode(from: request)
    }

    func logout() async throws {
        token = nil
    }

    func isAuthenticated() async -> Bool {
        token != nil
    }

    func sessionList() async throws -> [Session] {
        let response: [SessionResponse] = try await get(Backend.sessions)
        return response.map { $0.model }
    }

    func subjectList() async throws -> [Subject] {
        let response: SubjectListResponse = try await get(Backend.subjects)
        return response.subjects.map { $0.model }
    }

    func trialList() async throws -> [Trial] {
        let response: TrialListResponse = try await get(Backend.trials)
        return response.trials.map { $0.model }
    }

    func videoList() async throws -> [Video] {
        let response: VideoListResponse = try await get(Backend.videos)
        return response.videos.map { $0.model }
    }

    func createSession() async throws -> Session {
        let response: [SessionResponse] = try await get(Backend.createSession)

        guard let session = response.first else {
            throw ModelHealthError.url(.badServerResponse)
        }

        return session.model
    }

    func createSubject(parameters: SubjectParameters) async throws -> Subject {
        guard let token else {
            throw ModelHealthError.url(.userAuthenticationRequired)
        }

        let request = URLRequest.post(
            Backend.subjects,
            token: token,
            body: parameters.body
        )

        let subject: SubjectResponse = try await networkService.decode(from: request)
        return subject.model
    }

    func calibrateCamera(
        _ session: Session,
        checkerboardDetails: CheckerboardDetails,
        statusUpdate: @Sendable (CalibrationStatus) -> Void
    ) async throws {
        guard let token else {
            throw ModelHealthError.url(.userAuthenticationRequired)
        }

        let metadataRequest = URLRequest.get(
            Backend.setMetadata(id: session.id),
            token: token,
            parameters: checkerboardDetails.parameters
        )

        let _: SessionResponse = try await networkService.decode(from: metadataRequest)

        let calibrationRequest = URLRequest.get(
            Backend.startRecording(id: session.id),
            token: token,
            parameters: ["name": "calibration"]
        )

        let trial: TrialResponse = try await networkService.decode(from: calibrationRequest)

        let calibrationImgRequest = URLRequest.get(
            Backend.calibrationImg(id: session.id),
            token: token
        )

        while true {
            let response: CalibrationImgResponse = try await networkService.decode(from: calibrationImgRequest)

            let sessionStatusRequest = URLRequest.get(
                Backend.sessionStatus(id: session.id),
                token: token,
                parameters: ["device_id": try DeviceIdentifier.getDeviceIdentifier()]
            )

            let sessionStatus: SessionStatusResponse = try await networkService.decode(from: sessionStatusRequest)

            switch response.status {
            case .done:
                let calibratedRequest = URLRequest.get(
                    Backend.calibratedCameras(id: session.id),
                    token: token
                )

                let calibratedResponse: CalibratedCamerasResponse = try await networkService.decode(from: calibratedRequest)

                guard calibratedResponse.calibratedCamerasCount >= 2 else {
                    throw ModelHealthError.calibration(.notEnoughCameras)
                }

                statusUpdate(.done)
                return

            case .error:
                throw ModelHealthError.calibration(.calibrationFailed)

            default:
                let trialRequest = URLRequest.get(
                    Backend.trial(id: trial.id),
                    token: token
                )

                let trialStatus: TrialResponse = try await networkService.decode(from: trialRequest)

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
            throw ModelHealthError.url(.userAuthenticationRequired)
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

        let _: SessionResponse = try await networkService.decode(from: metadataRequest)

        let subjectRequest = URLRequest.get(
            Backend.setSubject(id: session.id),
            token: token,
            parameters: ["subject_id": "\(subject.id)"]
        )

        let _: SessionResponse = try await networkService.decode(from: subjectRequest)

        let recordingRequest = URLRequest.get(
            Backend.startRecording(id: session.id),
            token: token,
            parameters: [
                "name": "neutral",
                "subject_id": "\(subject.id)"
            ]
        )

        let trial: TrialResponse = try await networkService.decode(from: recordingRequest)

        let neutralImgRequest = URLRequest.get(
            Backend.neutralImg(id: session.id),
            token: token
        )

        while true {
            let response: NeutralImgResponse = try await networkService.decode(from: neutralImgRequest)

            switch response.status {
            case .done:
                statusUpdate(.done)
                return

            case .error:
                throw ModelHealthError.calibration(.calibrationFailed)

            case .recording:
                statusUpdate(.recording)

            default:
                let trialRequest = URLRequest.get(
                    Backend.trial(id: trial.id),
                    token: token
                )

                let trialStatus: TrialResponse = try await networkService.decode(from: trialRequest)

                if trialStatus.status == "stopped" || trialStatus.status == "processing" {
                    let isUploadingVideos = trialStatus.videos.contains { $0.video == nil }

                    if isUploadingVideos {
                        let sessionStatusRequest = URLRequest.get(
                            Backend.sessionStatus(id: session.id),
                            token: token
                        )
                        let sessionStatus: SessionStatusResponse = try await networkService.decode(from: sessionStatusRequest)

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

    func record(trialNamed name: String, in session: Session) async throws -> Trial {
        guard let token else {
            throw ModelHealthError.url(.userAuthenticationRequired)
        }

        let recordingRequest = URLRequest.get(
            Backend.startRecording(id: session.id),
            token: token,
            parameters: ["name": name]
        )

        let response: TrialResponse = try await networkService.decode(from: recordingRequest)
        return response.model
    }

    func stopRecording(_ session: Session) async throws {
        guard let token else {
            throw ModelHealthError.url(.userAuthenticationRequired)
        }

        let request = URLRequest.get(
            Backend.stopRecording(id: session.id),
            token: token
        )

        let _: TrialResponse = try await networkService.decode(from: request)
    }

    func getStatus(forTrial trial: Trial) async throws -> TrialProcessingStatus {
        guard let token else {
            throw ModelHealthError.url(.userAuthenticationRequired)
        }

        let trialRequest = URLRequest.get(
            Backend.trial(id: trial.id),
            token: token
        )

        let updatedTrial: TrialResponse = try await networkService.decode(from: trialRequest)

        switch updatedTrial.status {
        case "done":
            return .ready

        case "error":
            return .failed

        case "stopped", "processing":
            let isUploadingVideos = updatedTrial.videos.contains { $0.video == nil }

            if isUploadingVideos {
                let sessionStatusRequest = URLRequest.get(
                    Backend.sessionStatus(id: updatedTrial.session),
                    token: token
                )

                let sessionStatus: SessionStatusResponse = try await networkService.decode(from: sessionStatusRequest)

                return .uploading(
                    uploaded: sessionStatus.nVideosUploaded,
                    total: sessionStatus.nCamerasConnected
                )
            } else {
                return .processing
            }
        default:
            return .processing
        }
    }

    func startAnalysis(
        _ analysisType: AnalysisType,
        for trial: Trial,
        in session: Session
    ) async throws -> AnalysisTask {
        guard let token else {
            throw ModelHealthError.url(.userAuthenticationRequired)
        }

        guard let trialName = trial.name else {

            // TODO
            throw ModelHealthError.url(.badURL)
        }

        let invokeRequest = URLRequest.post(
            Backend.invokeAnalysis(functionId: analysisType.id),
            token: token,
            body: [
                "session_id": session.id,
                "specific_trial_names": [trialName]
            ]
        )

        let response: InvokeAnalysisResponse = try await networkService.decode(from: invokeRequest)

        return AnalysisTask(taskId: response.taskId)
    }

    func getAnalysisStatus(for task: AnalysisTask) async throws -> AnalysisTaskStatus {
        guard let token else {
            throw ModelHealthError.url(.userAuthenticationRequired)
        }

        let resultRequest = URLRequest.get(
            Backend.analysisResult(taskId: task.taskId),
            token: token
        )

        let (data, response) = try await networkService.data(for: resultRequest)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw ModelHealthError.url(.badServerResponse)
        }

        switch httpResponse.statusCode {
        case 202:
            return .processing

        case 200:
            let result = try JSONDecoder.snakeCase.decode(
                AnalysisStatusResponse.self,
                from: data
            )

            switch result.state {
            case .successful:
                let tags = result.results?.map { $0.tag } ?? []
                return .completed(resultTags: tags)

            case .failed:
                return .failed

            case .processing:
                return .processing
            }

        default:
            throw ModelHealthError.url(.badServerResponse)
        }
    }

    func downloadAnalysisResult(
        forTrial trial: Trial,
        resultTag: String
    ) async throws -> AnalysisResult {
        guard let _ = token else {
            throw ModelHealthError.url(.userAuthenticationRequired)
        }

        guard let result = trial.results.first(where: { $0.tag == resultTag }) else {
            throw ModelHealthError.url(.fileDoesNotExist)
        }

        guard let media = result.media, let mediaURL = URL(string: media) else {
            throw ModelHealthError.url(.badURL)
        }

        let response: AnalysisResultResponse = try await get(mediaURL)
        return response.model
    }
}

extension ModelHealthProviderImpl {
    private func get<T: Decodable & Sendable>(_ url: URL) async throws -> T {
        guard let token else {
            throw ModelHealthError.url(.userAuthenticationRequired)
        }

        let request = URLRequest.get(url, token: token)
        return try await networkService.decode(from: request)
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

private extension CheckerboardDetails {
    var parameters: [String: String] {
        [
            "cb_rows": String(rows),
            "cb_cols": String(columns),
            "cb_square": String(squareSize),
            "cb_placement": placement.rawValue.capitalized
        ]
    }
}

private extension RegistrationParameters {
    var body: [String: String] {
        var body: [String: String] = [
            "username": username,
            "email": email,
            "password": password,
            "first_name": firstName,
            "last_name": lastName,
            "newsletter": newsletter ? "true" : "false"
        ]

        country.map { body["country"] = $0 }
        institution.map { body["institution"] = $0 }
        profession.map { body["profession"] = $0 }
        reason.map { body["reason"] = $0 }
        website.map { body["website"] = $0 }
        language.map { body["language"] = $0 }
        unit.map { body["unit"] = $0.rawValue }

        return body
    }
}

private extension Subject.Gender {
    var parameter: SubjectResponse.Gender {
        switch self {
        case .woman:
            return .woman

        case .man:
            return .man

        case .transgender:
            return .transgender

        case .nonBinary:
            return .nonBinary

        case .noResponse:
            return .noResponse
        }
    }
}

private extension Subject.Sex {
    var parameter: SubjectResponse.Sex {
        switch self {
        case .man:
            return .man
            
        case .woman:
            return .woman

        case .intersex:
            return .intersect

        case .notListed:
            return .notListed

        case .noResponse:
            return .noResponse
        }
    }
}

private extension SubjectParameters {
    var body: [String: Any] {
        var body: [String: Any] = [
            "name": name,
            "weight": weight,
            "height": height / 100.0,
            "birth_year": birthYear,
            "sex_at_birth": sexAtBirth.parameter.rawValue,
            "gender": gender.parameter.rawValue,
            "subject_tags": subjectTags.isEmpty ? ["unimpaired"] : subjectTags,
            "terms": terms
        ]

        if !characteristics.isEmpty {
            body["characteristics"] = characteristics
        }
        
        return body
    }
}

private extension AnalysisType {
    var id: String {
        switch self {
        case .counterMovementJump:
            "36"
        }
    }
}
