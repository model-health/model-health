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
    let trials: [Trial]
}

struct VideosResponse: Decodable {
    let videos: [Video]
}

struct EmptyResponse: Decodable {
}

struct CalibrationImgResponse: Decodable {
    let status: String
    let nCamerasConnected: Int
    let nVideosUploaded: Int
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
    enum Status: String, Decodable {
        case recording
        case uploading
        case processing
        case done
        case error
    }

    let status: Status
    let images: [String]?
    let progressInfo: ProgressInfo?
}
