import Foundation

protocol SimpleDateDecodable: Decodable {
}

protocol ISODateDecodable: Decodable {
}

struct LoginResponse: SimpleDateDecodable {
    let token: String
    let userId: Int
    let otpChallengeSent: Bool
    let institutionalUse: String
    let licenseStartDate: Date
    let licenseEndDate: Date
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
    let videoUrl: String?
    let videoThumb: String?
}

extension VideoResponse {
    var model: Video {
        Video(
            id: id,
            trial: trial,
            video: video,
            videoUrl: videoUrl,
            videoThumb: videoThumb
        )
    }
}

struct Result: Decodable, Sendable {
    let id: Int
    let trial: String
    let tag: String?
}

struct TrialResponse: Decodable, Sendable {
    let id: String
    let session: String
    let name: String?
    let status: String
    let videos: [VideoResponse]
    let results: [Result]
}

extension TrialResponse {
    var model: Trial {
        Trial(
            id: id,
            session: session,
            name: name,
            status: status,
            videos: videos.map { $0.model }
        )
    }
}
