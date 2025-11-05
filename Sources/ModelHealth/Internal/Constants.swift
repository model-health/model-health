import Foundation

public extension Session {
    @MainActor static let shared = Session(id: "a4e7f3af-92a9-407e-a5a9-465fa4314248")
}

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
}

extension String {
    
}

struct MetaData {
    static let session = """
        {
            "settings": {
                "framerate": "60",
                "datasharing": "Share processed data and identified videos",
                "openSimModel": "LaiUhlrich2022_shoulder",
                "scalingsetup": "upright_standing_pose",
                "augmentermodel": "v0.3",
                "filterfrequency": "default"
            },
            "sessionName": "api-demo",
            "checkerboard": {
                "cols": "5",
                "rows": "4",
                "placement": "Perpendicular",
                "square_size": "35"
            }
        }
        """

    static func subject() -> String {
        """
        {
            "name": "Warren_\(UUID().uuidString.prefix(6))"
            "weight": 68.0,
            "height": 1.70,
            "birth_year": 1975
        }
        """
    }
}
