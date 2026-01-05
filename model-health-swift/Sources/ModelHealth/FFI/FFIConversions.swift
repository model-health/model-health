import Foundation

// MARK: - Internal FFI to Model Conversions

enum FFIConversionError: Error {
    case nullPointer(String)
    case invalidData(String)
}

extension Session {
    internal static func from(cSession: CSession) throws -> Session {
        guard let id = cSession.id else {
            throw FFIConversionError.nullPointer("Session ID is null")
        }

        guard let name = cSession.name else {
            throw FFIConversionError.nullPointer("Session name is null")
        }

        guard let sessionName = cSession.sessionName else {
            throw FFIConversionError.nullPointer("Session sessionName is null")
        }

        return Session(
            id: String(cString: id),
            user: Int(cSession.user),
            public: cSession.isPublic,
            name: String(cString: name),
            sessionName: String(cString: sessionName),
            qrcode: cSession.qrcode.map { String(cString: $0) },
            activities: [],
            subject: cSession.subject == -1 ? nil : Int(cSession.subject),
            activitiesCount: Int(cSession.trialsCount)
        )
    }
}

extension Subject {
    internal static func from(cSubject: CSubject) throws -> Subject {
        guard let name = cSubject.name else {
            throw FFIConversionError.nullPointer("Subject name is null")
        }

        guard let characteristics = cSubject.characteristics else {
            throw FFIConversionError.nullPointer("Subject characteristics is null")
        }

        guard let tagsJson = cSubject.subjectTagsJson else {
            throw FFIConversionError.nullPointer("Subject tags JSON is null")
        }

        let tagsString = String(cString: tagsJson)
        let subjectTags: [String] = {
            guard
                let data = tagsString.data(using: .utf8),
                let decoded = try? JSONDecoder().decode([String].self, from: data)
            else {
                return []
            }

            return decoded
        }()

        return Subject(
            id: Int(cSubject.id),
            name: String(cString: name),
            weight: cSubject.weight == 0.0 ? nil : cSubject.weight,
            height: cSubject.height == 0.0 ? nil : cSubject.height,
            age: cSubject.age == -1 ? nil : Int(cSubject.age),
            birthYear: cSubject.birthYear == 0 ? nil : Int(cSubject.birthYear),
            gender: genderFromI32(cSubject.gender),
            sexAtBirth: sexFromI32(cSubject.sexAtBirth),
            characteristics: String(cString: characteristics),
            subjectTags: subjectTags
        )
    }
}

extension Video {
    internal static func from(cVideo: CVideo) throws -> Video {
        guard let id = cVideo.id else {
            throw FFIConversionError.nullPointer("Video ID is null")
        }

        guard let trial = cVideo.trial else {
            throw FFIConversionError.nullPointer("Video trial is null")
        }

        return Video(
            id: String(cString: id),
            activity: String(cString: trial),
            video: cVideo.video.map { String(cString: $0) },
            videoThumb: cVideo.videoThumb.map { String(cString: $0) }
        )
    }
}

extension Activity.Result {
    internal static func from(cResult: CTrialResult) throws -> Activity.Result {
        guard let trial = cResult.trial else {
            throw FFIConversionError.nullPointer("Trial result trial is null")
        }

        return Activity.Result(
            id: Int(cResult.id),
            activity: String(cString: trial),
            tag: cResult.tag.map { String(cString: $0) },
            media: cResult.media.map { String(cString: $0) }
        )
    }
}

extension Activity {
    internal static func from(cTrial: CTrial) throws -> Activity {
        guard let id = cTrial.id else {
            throw FFIConversionError.nullPointer("Trial ID is null")
        }

        guard let session = cTrial.session else {
            throw FFIConversionError.nullPointer("Trial session is null")
        }

        guard let status = cTrial.status else {
            throw FFIConversionError.nullPointer("Trial status is null")
        }

        var videos: [Video] = []
        if cTrial.videos.count > 0, let videosPtr = cTrial.videos.videos {
            videos = try (0..<cTrial.videos.count).map { i in
                try Video.from(cVideo: videosPtr[i])
            }
        }

        var results: [Activity.Result] = []
        if cTrial.results.count > 0, let resultsPtr = cTrial.results.results {
            results = try (0..<cTrial.results.count).map { i in
                try Activity.Result.from(cResult: resultsPtr[i])
            }
        }

        return Activity(
            id: String(cString: id),
            session: String(cString: session),
            name: cTrial.name.map { String(cString: $0) },
            status: String(cString: status),
            videos: videos,
            results: results
        )
    }
}

extension AnalysisTask {
    internal static func from(cTask: CAnalysisTask) throws -> AnalysisTask {
        guard let taskId = cTask.taskId else {
            throw FFIConversionError.nullPointer("Analysis task ID is null")
        }

        return AnalysisTask(taskId: String(cString: taskId))
    }
}

extension ActivityProcessingStatus {
    internal static func from(statusCode: Int32, uploaded: Int32, total: Int32) -> ActivityProcessingStatus
    {
        switch statusCode {
        case 0:
            return .uploading(uploaded: Int(uploaded), total: Int(total))

        case 1:
            return .processing

        case 2:
            return .ready

        case 3:
            return .failed

        default:
            return .failed
        }
    }
}

extension AnalysisTaskStatus {
    internal static func from(statusCode: Int32, resultTagsJson: String?) throws -> AnalysisTaskStatus
    {
        switch statusCode {
        case 0:
            return .processing

        case 1:
            guard
                let jsonString = resultTagsJson,
                let data = jsonString.data(using: .utf8),
                let tags = try? JSONDecoder().decode([String].self, from: data)
            else {
                throw FFIConversionError.invalidData("Failed to decode result tags JSON")
            }
            return .completed(resultTags: tags)

        case 2:
            return .failed

        default:
            throw FFIConversionError.invalidData("Unknown analysis status code: \(statusCode)")
        }
    }
}

extension AnalysisResult {
    internal static func from(jsonString: String) throws -> AnalysisResult {
        guard let data = jsonString.data(using: .utf8) else {
            throw FFIConversionError.invalidData("Failed to convert JSON string to data")
        }

        do {
            let codable = try JSONDecoder().decode(CodableAnalysisResult.self, from: data)
            return codable.toPublic()
        } catch {
            throw FFIConversionError.invalidData("Failed to decode AnalysisResult: \(error)")
        }
    }
}

extension CalibrationStatus {
    internal static func from(jsonString: String) throws -> CalibrationStatus {
        guard let data = jsonString.data(using: .utf8) else {
            throw FFIConversionError.invalidData("Failed to convert JSON string to data")
        }

        do {
            let codable = try JSONDecoder().decode(CodableCalibrationStatus.self, from: data)
            return codable.toPublic()
        } catch {
            throw FFIConversionError.invalidData("Failed to decode CalibrationStatus: \(error)")
        }
    }
}

extension LoginResult {
    internal static func from(resultCode: Int32) throws -> LoginResult {
        switch resultCode {
        case 0:
            return .ok

        case 1:
            return .verificationRequired

        default:
            throw FFIConversionError.invalidData("Unknown login result code: \(resultCode)")
        }
    }
}

// MARK: - Helper Functions

private func genderFromI32(_ value: Int32) -> Subject.Gender {
    switch value {
    case 0:
        .man

    case 1:
        .woman

    case 2:
        .transgender

    case 3:
        .nonBinary

    case 4:
        .noResponse

    default:
        .noResponse
    }
}

private func sexFromI32(_ value: Int32) -> Subject.Sex {
    switch value {
    case 0:
        .man

    case 1:
        .woman

    case 2:
        .intersex

    case 3:
        .notListed

    case 4:
        .noResponse

    default:
        .noResponse
    }
}

// MARK: - Internal Codable Types for FFI Deserialization

private struct CodableAnalysisResult: Codable {
    let analysisTitle: String
    let analysisDescription: String
    let metrics: [String: CodableMetric]

    enum CodingKeys: String, CodingKey {
        case analysisTitle = "analysis_title"
        case analysisDescription = "analysis_description"
        case metrics
    }

    func toPublic() -> AnalysisResult {
        AnalysisResult(
            analysisTitle: analysisTitle,
            analysisDescription: analysisDescription,
            metrics: metrics.mapValues { $0.toPublic() }
        )
    }
}

private struct CodableMetric: Codable {
    let label: String
    let bilateral: Bool
    let value: CodableMetricValue
    let info: String
    let decimalPlaces: Int

    enum CodingKeys: String, CodingKey {
        case label
        case bilateral
        case value
        case info
        case decimalPlaces = "decimal_places"
    }

    func toPublic() -> AnalysisResult.Metric {
        AnalysisResult.Metric(
            label: label,
            bilateral: bilateral,
            value: value.toPublic(),
            info: info,
            decimalPlaces: decimalPlaces
        )
    }
}

private enum CodableMetricValue: Codable {
    case single(Double)
    case bilateral(left: Double, right: Double)

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let single = try? container.decode(Double.self) {
            self = .single(single)
        } else if let bilateral = try? container.decode([String: Double].self) {
            self = .bilateral(left: bilateral["left"]!, right: bilateral["right"]!)
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Invalid metric value"
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch self {
        case .single(let value):
            try container.encode(value)

        case .bilateral(let left, let right):
            try container.encode(["left": left, "right": right])
        }
    }

    func toPublic() -> AnalysisResult.MetricValue {
        switch self {
        case .single(let value):
            .single(value)

        case .bilateral(let left, let right):
            .bilateral(left: left, right: right)
        }
    }
}

private enum CodableCalibrationStatus: Codable {
    case recording
    case uploading(uploaded: Int, total: Int)
    case processing(percent: Int?)
    case done

    enum CodingKeys: String, CodingKey {
        case type
        case uploaded
        case total
        case percent
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)

        switch type {
        case "recording":
            self = .recording

        case "uploading":
            let uploaded = try container.decode(Int.self, forKey: .uploaded)
            let total = try container.decode(Int.self, forKey: .total)
            self = .uploading(uploaded: uploaded, total: total)

        case "processing":
            let percent = try? container.decode(Int.self, forKey: .percent)
            self = .processing(percent: percent)

        case "done":
            self = .done

        default:
            throw DecodingError.dataCorruptedError(
                forKey: .type,
                in: container,
                debugDescription: "Unknown calibration status"
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case .recording:
            try container.encode("recording", forKey: .type)

        case .uploading(let uploaded, let total):
            try container.encode("uploading", forKey: .type)
            try container.encode(uploaded, forKey: .uploaded)
            try container.encode(total, forKey: .total)

        case .processing(let percent):
            try container.encode("processing", forKey: .type)
            if let percent = percent {
                try container.encode(percent, forKey: .percent)
            }

        case .done:
            try container.encode("done", forKey: .type)
        }
    }

    func toPublic() -> CalibrationStatus {
        switch self {
        case .recording:
            return .recording

        case .uploading(let uploaded, let total):
            return .uploading(uploaded: uploaded, total: total)

        case .processing(let percent):
            return .processing(percent: percent)

        case .done:
            return .done
        }
    }
}
