import Foundation

struct LoginResponse: Decodable {
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
