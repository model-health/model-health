import Foundation

enum HTTPMethod: String {
    case get
    case post
    case options
    case patch

    var name: String {
        self.rawValue.uppercased()
    }
}

enum Backend {
    static let baseURL = "http://localhost:8000"
//    static let baseURL = "https://dev.modelhealth.io"

    static let login = URL(string: "\(baseURL)/login/")!
    static let verify = URL(string: "\(baseURL)/verify/")!
    static let subjects = URL(string: "\(baseURL)/subjects/")!
    static let trials = URL(string: "\(baseURL)/trials/")!
    static let videos = URL(string: "\(baseURL)/videos/")!
    static let createSession = URL(string: "\(baseURL)/sessions/new/")!

    static func session(_ id: String) -> URL {
        URL(string: "\(baseURL)/sessions/\(id)/")!
    }

    static func trial(id: String) -> URL {
        URL(string: "\(baseURL)/trials/\(id)/")!
    }

    static func setSubject(id: String) -> URL {
        URL(string: "\(session(id))set_subject/")!
    }

    static func startRecording(id: String) -> URL {
        URL(string: "\(session(id))record/")!
    }

    static func stopRecording(id: String) -> URL {
        URL(string: "\(session(id))stop/")!
    }

    static func sessionStatus(id: String) -> URL {
        URL(string: "\(session(id))status/")!
    }

    static func calibrationImg(id: String) -> URL {
        URL(string: "\(session(id))calibration_img/")!
    }

    static func setMetadata(id: String) -> URL {
        URL(string: "\(session(id))set_metadata/")!
    }

    static func neutralImg(id: String) -> URL {
        URL(string: "\(session(id))neutral_img/")!
    }
}
