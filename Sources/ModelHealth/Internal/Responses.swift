import Foundation

protocol SimpleDateDecodable: Decodable {
}

struct LoginResponse: SimpleDateDecodable {
    let token: String
    let userId: Int
    let otpChallengeSent: Bool
    let institutionalUse: String
    let licenseStartDate: Date
    let licenseEndDate: Date
}

struct SessionResponse: Decodable, Identifiable {
    let id: String
    let user: Int
    let `public`: Bool
    let name: String
    let sessionName: String
    let qrcode: String?
    let trials: [TrialResponse]
    let subject: Int?
    let trialsCount: Int
}

extension SessionResponse {
    var model: Session {
        Session(
            id: id,
            user: user,
            public: `public`,
            name: name,
            sessionName: sessionName,
            qrcode: qrcode,
            trials: trials.map { $0.model },
            subject: subject,
            trialsCount: trialsCount
        )
    }
}

struct SubjectsResponse: Decodable {
    let subjects: [Subject]
}

struct TrialsResponse: Decodable {
    let trials: [TrialResponse]
}

struct VideosResponse: Decodable {
    let videos: [VideoResponse]
}

struct EmptyResponse: Decodable {
}

enum ImgResponseStatus: String, Decodable {
    case recording
    case uploading
    case processing
    case done
    case error
}

struct CalibrationImgResponse: Decodable {
    let status: ImgResponseStatus
    let images: [String]?
}

struct NeutralPoseSettings {
    let dataSharing: String
    let scalingSetup: String
    let framerate: Int
    let sessionName: String?
    let openSimModel: String
    let augmenterModel: String
    let filterFrequency: String

    static let `default` = NeutralPoseSettings(
        dataSharing: "identified",
        scalingSetup: "Default",
        framerate: 60,
        sessionName: nil,
        openSimModel: "LaiUhlrich2022_shoulder",
        augmenterModel: "v0.3",
        filterFrequency: "default"
    )
}

struct ProgressInfo: Decodable {
    let percent: Int
    let message: String
}

struct NeutralImgResponse: Decodable {
    let status: ImgResponseStatus
    let images: [String]?
    let progressInfo: ProgressInfo?
}

struct CalibratedCamerasResponse: Decodable {
    let calibratedCamerasCount: Int

    enum CodingKeys: String, CodingKey {
        case calibratedCamerasCount = "data"
    }
}
struct SessionStatusResponse: Decodable, Sendable {
    let status: String
    let trial: String
    let framerate: Int
    let nCamerasConnected: Int
    let nVideosUploaded: Int
    let nCalibratedCameras: Int?
}

struct VideoResponse: Decodable, Sendable {
    let id: String
    let trial: String
    let deviceId: String
    let video: String?
    let videoThumb: String?
}

extension VideoResponse {
    var model: Video {
        Video(
            id: id,
            trial: trial,
            video: video,
            videoThumb: videoThumb
        )
    }
}

struct ResultResponse: Decodable, Sendable {
    let id: Int
    let trial: String
    let tag: String?
    let media: String?
}

extension ResultResponse {
    var model: Trial.Result {
        Trial.Result(
            id: id,
            trial: trial,
            tag: tag,
            media: media
        )
    }
}

struct TrialResponse: Decodable, Sendable {
    enum Status: String, Decodable {
        case done
        case error
        case stopped
        case processing
    }

    let id: String
    let session: String
    let name: String?
    let status: String
    let videos: [VideoResponse]
    let results: [ResultResponse]
}

extension TrialResponse.Status {
    var model: Trial.Status {
        switch self {
        case .done:
            return .done

        case .error:
            return .error

        case .stopped:
            return .stopped

        case .processing:
            return .processing
        }
    }
}

extension TrialResponse {
    var model: Trial {
        Trial(
            id: id,
            session: session,
            name: name,
            status: status,
            videos: videos.map { $0.model },
            results: results.map { $0.model }
        )
    }
}

struct InvokeAnalysisResponse: Decodable {
    let taskId: String
}

struct AnalysisStatusResponse: Decodable, Sendable {
    let state: State
    let results: [Result]?

    enum State: String, Decodable, Sendable {
        case successful = "successfull"  // Note: typo in API
        case failed = "failed"
        case processing = "processing"
    }

    struct Result: Decodable, Sendable {
        let tag: String
    }
}

struct AnalysisResultResponse: Decodable, Sendable {
    let analysisFunction: AnalysisFunction
    let response: Response

    struct AnalysisFunction: Decodable, Sendable {
        let id: Int
        let title: String
        let description: String
    }

    struct Response: Decodable, Sendable {
        let metrics: [String: Metric]
    }

    struct BilateralValue: Decodable, Sendable {
        let left: Double
        let right: Double
    }

    enum MetricValue: Sendable {
        case single(Double)
        case bilateral(BilateralValue)
    }

    struct Metric: Decodable, Sendable {
        let label: String
        let bilateral: Bool
        let value: MetricValue
        let info: String
        let decimal: Int

        enum CodingKeys: String, CodingKey {
            case label, bilateral, value, info, decimal
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            label = try container.decode(String.self, forKey: .label)
            bilateral = try container.decode(Bool.self, forKey: .bilateral)
            info = try container.decode(String.self, forKey: .info)
            decimal = try container.decode(Int.self, forKey: .decimal)

            // Decode value based on bilateral flag
            if bilateral {
                let bilateralValue = try container.decode(BilateralValue.self, forKey: .value)
                value = .bilateral(bilateralValue)
            } else {
                let singleValue = try container.decode(Double.self, forKey: .value)
                value = .single(singleValue)
            }
        }
    }
}

extension AnalysisResultResponse {
    var model: AnalysisResult {
        AnalysisResult(
            analysisTitle: analysisFunction.title,
            analysisDescription: analysisFunction.description,
            metrics: response.metrics.mapValues { metric in
                AnalysisResult.Metric(
                    label: metric.label,
                    bilateral: metric.bilateral,
                    value: {
                        switch metric.value {
                        case .single(let value):
                            return .single(value)
                        case .bilateral(let bilateral):
                            return .bilateral(left: bilateral.left, right: bilateral.right)
                        }
                    }(),
                    info: metric.info,
                    decimalPlaces: metric.decimal
                )
            }
        )
    }
}
