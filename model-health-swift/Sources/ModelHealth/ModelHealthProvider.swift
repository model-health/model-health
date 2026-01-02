import Foundation

/// Internal implementation of ModelHealthProvider using Rust FFI
internal final class ModelHealthProviderImpl: ModelHealthProvider {
    private let handle: OpaquePointer
    
    init() throws {
        guard let handle = model_health_provider_new() else {
            throw ModelHealthError.internalError("Failed to create provider")
        }
        self.handle = handle

        if let token = KeychainHelper.get(.authToken) {
             try? setToken(token)
         }
    }
    
    deinit {
        model_health_provider_free(handle)
    }
    
    // MARK: - Authentication
    
    func register(parameters: RegistrationParameters) async throws {
        try await withCheckedThrowingContinuation { continuation in
            let result = parameters.username.withCString { username in
                parameters.email.withCString { email in
                    parameters.password.withCString { password in
                        parameters.firstName.withCString { firstName in
                            parameters.lastName.withCString { lastName in
                                model_health_register(
                                    handle,
                                    username,
                                    email,
                                    password,
                                    firstName,
                                    lastName,
                                    parameters.newsletter
                                )
                            }
                        }
                    }
                }
            }
            
            handleFFIResult(result, continuation: continuation)
        }

        if let token = getToken() {
            try? KeychainHelper.save(token, for: .authToken)
        }
    }

    func login(username: String, password: String) async throws -> LoginResult {
        try await withCheckedThrowingContinuation { continuation in
            var resultCode: Int32 = -1
            
            let result = username.withCString { u in
                password.withCString { p in
                    model_health_login(handle, u, p, &resultCode)
                }
            }
            
            if result.success {
                do {
                    if let token = getToken() {
                        try? KeychainHelper.save(token, for: .authToken)
                    }

                    let loginResult = try LoginResult.from(resultCode: resultCode)
                    continuation.resume(returning: loginResult)
                } catch {
                    continuation.resume(throwing: error)
                }
            } else {
                handleFFIError(result, continuation: continuation)
            }
        }
    }
    
    func verify(code: String, rememberDevice: Bool) async throws {
        try await withCheckedThrowingContinuation { continuation in
            let result = code.withCString { c in
                model_health_verify(handle, c, rememberDevice)
            }
            
            handleFFIResult(result, continuation: continuation)
        }
    }
    
    func logout() async throws {
        try await withCheckedThrowingContinuation { continuation in
            let result = model_health_logout(handle)
            KeychainHelper.delete(.authToken)
            handleFFIResult(result, continuation: continuation)
        }
    }
    
    func isAuthenticated() async -> Bool {
        await withCheckedContinuation { continuation in
            var isAuth = false
            let result = model_health_is_authenticated(handle, &isAuth)
            
            if result.success {
                continuation.resume(returning: isAuth)
            } else {
                continuation.resume(returning: false)
            }
        }
    }

    private func getToken() -> String? {
        guard let cString = model_health_get_token(handle) else {
            return nil
        }

        defer { model_health_free_string(cString) }
        return String(cString: cString)
    }

    private func setToken(_ token: String) throws {
        let result = token.withCString { model_health_set_token(handle, $0) }

        guard result.success else {
            if let errorMessage = result.errorMessage {
                let error = String(cString: errorMessage)
                model_health_free_error(errorMessage)
                throw ModelHealthError.internalError(error)
            }
            
            throw ModelHealthError.internalError("Failed to set token")
        }
    }

    // MARK: - List Operations
    
    func sessionList() async throws -> [Session] {
        try await withCheckedThrowingContinuation { continuation in
            var cArray = CSessionArray(sessions: nil, count: 0)
            let result = model_health_session_list(handle, &cArray)
            
            defer {
                model_health_free_session_array(cArray)
            }
            
            if result.success {
                do {
                    var sessions: [Session] = []
                    if cArray.count > 0, let sessionsPtr = cArray.sessions {
                        sessions = try (0..<cArray.count).map { i in
                            try Session.from(cSession: sessionsPtr[i])
                        }
                    }
                    continuation.resume(returning: sessions)
                } catch {
                    continuation.resume(
                        throwing: ModelHealthError.internalError(error.localizedDescription))
                }
            } else {
                handleFFIError(result, continuation: continuation)
            }
        }
    }
    
    func subjectList() async throws -> [Subject] {
        try await withCheckedThrowingContinuation { continuation in
            var cArray = CSubjectArray(subjects: nil, count: 0)
            let result = model_health_subject_list(handle, &cArray)
            
            defer {
                model_health_free_subject_array(cArray)
            }
            
            if result.success {
                do {
                    var subjects: [Subject] = []
                    if cArray.count > 0, let subjectsPtr = cArray.subjects {
                        subjects = try (0..<cArray.count).map { i in
                            try Subject.from(cSubject: subjectsPtr[i])
                        }
                    }
                    continuation.resume(returning: subjects)
                } catch {
                    continuation.resume(
                        throwing: ModelHealthError.internalError(error.localizedDescription))
                }
            } else {
                handleFFIError(result, continuation: continuation)
            }
        }
    }
    
    func trialList(for session: Session) async throws -> [Trial] {
        try await withCheckedThrowingContinuation { continuation in
            var cArray = CTrialArray(trials: nil, count: 0)
            let result = session.id.withCString { sessionId in
                model_health_trial_list_for_session(handle, sessionId, &cArray)
            }
            
            defer {
                model_health_free_trial_array(cArray)
            }
            
            if result.success {
                do {
                    var trials: [Trial] = []
                    if cArray.count > 0, let trialsPtr = cArray.trials {
                        trials = try (0..<cArray.count).map { i in
                            try Trial.from(cTrial: trialsPtr[i])
                        }
                    }
                    continuation.resume(returning: trials)
                } catch {
                    continuation.resume(
                        throwing: ModelHealthError.internalError(error.localizedDescription))
                }
            } else {
                handleFFIError(result, continuation: continuation)
            }
        }
    }
    
    func videos(for trial: Trial, version: VideoVersion) async -> [Data] {
        await withCheckedContinuation { continuation in
            var cArray = CDataArray(items: nil, count: 0)
            
            let versionCode: Int32 = version == .raw ? 0 : 1
            
            let result = trial.id.withCString { trialId in
                trial.session.withCString { sessionId in
                    model_health_download_trial_videos(
                        handle,
                        trialId,
                        sessionId,
                        versionCode,
                        &cArray
                    )
                }
            }
            
            defer {
                model_health_free_data_array(cArray)
            }
            
            if result.success, cArray.count > 0, let itemsPtr = cArray.items {
                let dataArray = (0..<cArray.count).compactMap { i -> Data? in
                    let item = itemsPtr[i]
                    guard let dataPtr = item.data, item.length > 0 else { return nil }
                    return Data(bytes: dataPtr, count: item.length)
                }
                continuation.resume(returning: dataArray)
            } else {
                continuation.resume(returning: [])
            }
        }
    }
    
    func data(ofType types: Set<ResultDataType>, for trial: Trial) async -> [ResultData] {
        await withCheckedContinuation { continuation in
            // Convert Set to array of Int32 codes
            let typeCodes: [Int32] = types.map { type in
                switch type {
                case .visualization:
                    return 0
                    
                case .kinematic:
                    return 1
                }
            }
            
            guard !typeCodes.isEmpty else {
                continuation.resume(returning: [])
                return
            }
            
            var cArray = CResultDataArray(items: nil, count: 0)
            
            let result = trial.id.withCString { trialId in
                trial.session.withCString { sessionId in
                    typeCodes.withUnsafeBufferPointer { buffer in
                        guard let baseAddress = buffer.baseAddress else {
                            return FFIResult(success: false, errorMessage: nil)
                        }
                        return model_health_download_trial_result_data(
                            handle,
                            trialId,
                            sessionId,
                            baseAddress,
                            typeCodes.count,
                            &cArray
                        )
                    }
                }
            }
            
            defer {
                model_health_free_result_data_array(cArray)
            }
            
            if result.success, cArray.count > 0, let itemsPtr = cArray.items {
                let results = (0..<cArray.count).compactMap { i -> ResultData? in
                    let item = itemsPtr[i]
                    guard let dataPtr = item.data, item.length > 0 else { return nil }
                    
                    let fileType: ResultData.FileType = item.fileType == 0 ? .json : .csv
                    let data = Data(bytes: dataPtr, count: item.length)
                    
                    return ResultData(fileType: fileType, data: data)
                }
                continuation.resume(returning: results)
            } else {
                continuation.resume(returning: [])
            }
        }
    }
    
    // MARK: - Create Operations
    
    func createSession() async throws -> Session {
        try await withCheckedThrowingContinuation { continuation in
            var cSession = CSession(
                id: nil, name: nil, sessionName: nil,
                user: 0, isPublic: false, qrcode: nil,
                subject: 0, trialsCount: 0
            )
            let result = model_health_create_session(handle, &cSession)
            
            if result.success {
                do {
                    let session = try Session.from(cSession: cSession)
                    // Free individual session fields
                    freeSessionFields(cSession)
                    continuation.resume(returning: session)
                } catch {
                    freeSessionFields(cSession)
                    continuation.resume(
                        throwing: ModelHealthError.internalError(error.localizedDescription))
                }
            } else {
                handleFFIError(result, continuation: continuation)
            }
        }
    }
    
    func createSubject(parameters: SubjectParameters) async throws -> Subject {
        try await withCheckedThrowingContinuation { continuation in
            var cSubject = CSubject(
                id: 0, name: nil, weight: 0, height: 0,
                age: 0, birthYear: 0, gender: 0, sexAtBirth: 0,
                characteristics: nil, subjectTagsJson: nil
            )
            
            let result = parameters.name.withCString { name in
                model_health_create_subject(
                    handle,
                    name,
                    parameters.weight,
                    parameters.height,
                    Int32(parameters.birthYear),
                    parameters.sexAtBirth.cValue,
                    parameters.gender.cValue,
                    parameters.terms,
                    &cSubject
                )
            }
            
            if result.success {
                do {
                    let subject = try Subject.from(cSubject: cSubject)
                    // Free individual subject fields
                    freeSubjectFields(cSubject)
                    continuation.resume(returning: subject)
                } catch {
                    freeSubjectFields(cSubject)
                    continuation.resume(
                        throwing: ModelHealthError.internalError(error.localizedDescription))
                }
            } else {
                handleFFIError(result, continuation: continuation)
            }
        }
    }
    
    // MARK: - Recording Operations
    
    func record(trialNamed name: String, in session: Session) async throws -> Trial {
        try await withCheckedThrowingContinuation { continuation in
            var cTrial = CTrial(
                id: nil, session: nil, name: nil, status: nil,
                videos: CVideoArray(videos: nil, count: 0),
                results: CTrialResultArray(results: nil, count: 0)
            )
            
            let result = name.withCString { trialName in
                session.id.withCString { sessionId in
                    model_health_record(handle, trialName, sessionId, &cTrial)
                }
            }
            
            if result.success {
                do {
                    let trial = try Trial.from(cTrial: cTrial)
                    // Free trial fields (including nested arrays)
                    freeTrialFields(cTrial)
                    continuation.resume(returning: trial)
                } catch {
                    freeTrialFields(cTrial)
                    continuation.resume(
                        throwing: ModelHealthError.internalError(error.localizedDescription))
                }
            } else {
                handleFFIError(result, continuation: continuation)
            }
        }
    }
    
    func stopRecording(_ session: Session) async throws {
        try await withCheckedThrowingContinuation { continuation in
            let result = session.id.withCString { sessionId in
                model_health_stop_recording(handle, sessionId)
            }
            
            handleFFIResult(result, continuation: continuation)
        }
    }
    
    // MARK: - Calibration Operations
    
    func calibrateCamera(
        _ session: Session,
        checkerboardDetails: CheckerboardDetails,
        statusUpdate: @escaping @Sendable (CalibrationStatus) -> Void
    ) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            let context = CallbackContext(
                statusUpdate: statusUpdate,
                continuation: continuation
            )
            let contextPtr = Unmanaged.passRetained(context).toOpaque()
            
            let result = session.id.withCString { sessionId in
                model_health_calibrate_camera(
                    handle,
                    sessionId,
                    Int32(checkerboardDetails.rows),
                    Int32(checkerboardDetails.columns),
                    Int32(checkerboardDetails.squareSize),
                    checkerboardDetails.placement.cValue,
                    { userDataPtr, statusJsonPtr in
                        guard let userDataPtr = userDataPtr,
                              let statusJsonPtr = statusJsonPtr
                        else { return }
                        
                        let context = Unmanaged<CallbackContext<CalibrationStatus>>.fromOpaque(userDataPtr)
                            .takeUnretainedValue()
                        let jsonString = String(cString: statusJsonPtr)
                        
                        do {
                            let status = try CalibrationStatus.from(jsonString: jsonString)
                            context.statusUpdate(status)
                        } catch {
                            // Ignore parsing errors in callback
                        }
                    },
                    contextPtr
                )
            }
            
            // Clean up context
            Unmanaged<CallbackContext<CalibrationStatus>>.fromOpaque(contextPtr).release()
            
            handleFFIResult(result, continuation: continuation)
        }
    }
    
    func calibrateNeutralPose(
        for subject: Subject,
        in session: Session,
        statusUpdate: @escaping @Sendable (CalibrationStatus) -> Void
    ) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            let context = CallbackContext(
                statusUpdate: statusUpdate,
                continuation: continuation
            )
            let contextPtr = Unmanaged.passRetained(context).toOpaque()
            
            let result = session.id.withCString { sessionId in
                model_health_calibrate_neutral_pose(
                    handle,
                    sessionId,
                    Int32(subject.id),
                    { userDataPtr, statusJsonPtr in
                        guard let userDataPtr = userDataPtr,
                              let statusJsonPtr = statusJsonPtr
                        else { return }
                        
                        let context = Unmanaged<CallbackContext<CalibrationStatus>>.fromOpaque(userDataPtr)
                            .takeUnretainedValue()
                        let jsonString = String(cString: statusJsonPtr)
                        
                        do {
                            let status = try CalibrationStatus.from(jsonString: jsonString)
                            context.statusUpdate(status)
                        } catch {
                            // Ignore parsing errors in callback
                        }
                    },
                    contextPtr
                )
            }
            
            // Clean up context
            Unmanaged<CallbackContext<CalibrationStatus>>.fromOpaque(contextPtr).release()
            
            handleFFIResult(result, continuation: continuation)
        }
    }
    
    // MARK: - Analysis Operations
    
    func getStatus(forTrial trial: Trial) async throws -> ActivityProcessingStatus {
        try await withCheckedThrowingContinuation { continuation in
            var statusCode: Int32 = -1
            var uploaded: Int32 = 0
            var total: Int32 = 0
            
            let result = trial.id.withCString { trialId in
                trial.session.withCString { sessionId in
                    model_health_get_trial_status(
                        handle,
                        trialId,
                        sessionId,
                        &statusCode,
                        &uploaded,
                        &total
                    )
                }
            }
            
            if result.success {
                let status = ActivityProcessingStatus.from(
                    statusCode: statusCode,
                    uploaded: uploaded,
                    total: total
                )
                continuation.resume(returning: status)
            } else {
                handleFFIError(result, continuation: continuation)
            }
        }
    }
    
    func startAnalysis(
        _ analysisType: AnalysisType,
        for trial: Trial,
        in session: Session
    ) async throws -> AnalysisTask {
        try await withCheckedThrowingContinuation { continuation in
            var cTask = CAnalysisTask(taskId: nil)
            
            let result = trial.id.withCString { trialId in
                session.id.withCString { sessionId in
                    model_health_start_analysis(
                        handle,
                        analysisType.cValue,
                        trialId,
                        sessionId,
                        &cTask
                    )
                }
            }
            
            if result.success {
                do {
                    let task = try AnalysisTask.from(cTask: cTask)
                    if let taskId = cTask.taskId {
                        model_health_free_string(taskId)
                    }
                    continuation.resume(returning: task)
                } catch {
                    if let taskId = cTask.taskId {
                        model_health_free_string(taskId)
                    }
                    continuation.resume(
                        throwing: ModelHealthError.internalError(error.localizedDescription))
                }
            } else {
                handleFFIError(result, continuation: continuation)
            }
        }
    }
    
    func getAnalysisStatus(for task: AnalysisTask) async throws -> AnalysisTaskStatus {
        try await withCheckedThrowingContinuation { continuation in
            var statusCode: Int32 = -1
            var resultTagsJsonPtr: UnsafeMutablePointer<CChar>? = nil
            
            let result = task.taskId.withCString { taskId in
                model_health_get_analysis_status(
                    handle,
                    taskId,
                    &statusCode,
                    &resultTagsJsonPtr
                )
            }
            
            defer {
                if let ptr = resultTagsJsonPtr {
                    model_health_free_string(ptr)
                }
            }
            
            if result.success {
                do {
                    let jsonString = resultTagsJsonPtr.map { String(cString: $0) }
                    let status = try AnalysisTaskStatus.from(
                        statusCode: statusCode,
                        resultTagsJson: jsonString
                    )
                    continuation.resume(returning: status)
                } catch {
                    continuation.resume(
                        throwing: ModelHealthError.internalError(error.localizedDescription))
                }
            } else {
                handleFFIError(result, continuation: continuation)
            }
        }
    }
    
    func downloadAnalysisResult(
        forTrial trial: Trial,
        resultTag: String
    ) async throws -> AnalysisResult {
        try await withCheckedThrowingContinuation { continuation in
            var resultJsonPtr: UnsafeMutablePointer<CChar>? = nil
            
            let result = trial.id.withCString { trialId in
                resultTag.withCString { tag in
                    model_health_download_analysis_result(
                        handle,
                        trialId,
                        tag,
                        &resultJsonPtr
                    )
                }
            }
            
            defer {
                if let ptr = resultJsonPtr {
                    model_health_free_string(ptr)
                }
            }
            
            if result.success {
                do {
                    guard let jsonPtr = resultJsonPtr else {
                        throw ModelHealthError.internalError("Null JSON result")
                    }
                    let jsonString = String(cString: jsonPtr)
                    let analysisResult = try AnalysisResult.from(jsonString: jsonString)
                    continuation.resume(returning: analysisResult)
                } catch {
                    continuation.resume(
                        throwing: ModelHealthError.internalError(error.localizedDescription))
                }
            } else {
                handleFFIError(result, continuation: continuation)
            }
        }
    }
}

// MARK: - Helper Methods

private extension ModelHealthProviderImpl {
    func handleFFIResult(
        _ result: FFIResult,
        continuation: CheckedContinuation<Void, Error>
    ) {
        if result.success {
            continuation.resume()
        } else {
            handleFFIError(result, continuation: continuation)
        }
    }
    
    func handleFFIError<T>(
        _ result: FFIResult,
        continuation: CheckedContinuation<T, Error>
    ) {
        if let errorMessage = result.errorMessage {
            let error = String(cString: errorMessage)
            model_health_free_error(errorMessage)
            continuation.resume(throwing: ModelHealthError.internalError(error))
        } else {
            continuation.resume(throwing: ModelHealthError.internalError("Unknown error"))
        }
    }
    
    func freeSessionFields(_ session: CSession) {
        if let id = session.id { model_health_free_string(id) }
        if let name = session.name { model_health_free_string(name) }
        if let sessionName = session.sessionName { model_health_free_string(sessionName) }
        if let qrcode = session.qrcode { model_health_free_string(qrcode) }
    }
    
    func freeSubjectFields(_ subject: CSubject) {
        if let name = subject.name { model_health_free_string(name) }
        if let characteristics = subject.characteristics { model_health_free_string(characteristics) }
        if let tagsJson = subject.subjectTagsJson { model_health_free_string(tagsJson) }
    }
    
    func freeTrialFields(_ trial: CTrial) {
        if let id = trial.id { model_health_free_string(id) }
        if let session = trial.session { model_health_free_string(session) }
        if let name = trial.name { model_health_free_string(name) }
        if let status = trial.status { model_health_free_string(status) }
        model_health_free_video_array(trial.videos)
        model_health_free_trial_result_array(trial.results)
    }
}

// MARK: - Callback Context

private class CallbackContext<T>: @unchecked Sendable {
    let statusUpdate: @Sendable (T) -> Void
    let continuation: Any  // Store continuation for cleanup
    
    init(statusUpdate: @escaping @Sendable (T) -> Void, continuation: Any) {
        self.statusUpdate = statusUpdate
        self.continuation = continuation
    }
}

// MARK: - Enum cValues

extension Subject.Gender {
    var cValue: Int32 {
        switch self {
        case .man:
            return 0

        case .woman:
            return 1

        case .transgender:
            return 2

        case .nonBinary:
            return 3

        case .noResponse:
            return 4
        }
    }
}

extension Subject.Sex {
    var cValue: Int32 {
        switch self {
        case .man:
            return 0

        case .woman:
            return 1

        case .intersex:
            return 2

        case .notListed:
            return 3

        case .noResponse:
            return 4
        }
    }
}

extension CheckerboardPlacement {
    var cValue: Int32 {
        switch self {
        case .perpendicular:
            return 0

        case .parallel:
            return 1
        }
    }
}

extension AnalysisType {
    var cValue: Int32 {
        switch self {
        case .counterMovementJump:
            return 0
        }
    }
}
