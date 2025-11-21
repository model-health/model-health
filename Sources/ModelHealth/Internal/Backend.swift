import Foundation

struct Backend {
    let configuration: Configuration

    var register: URL {
        URL(string: "\(configuration.baseURL)/register/")!
    }

    var login: URL {
        URL(string: "\(configuration.baseURL)/login/")!
    }

    var verify: URL {
        URL(string: "\(configuration.baseURL)/verify/")!
    }

    var sessions: URL {
        URL(string: "\(configuration.baseURL)/sessions/")!
    }

    var subjects: URL {
        URL(string: "\(configuration.baseURL)/subjects/")!
    }

    var trials: URL {
        URL(string: "\(configuration.baseURL)/trials/")!
    }

    var videos: URL {
        URL(string: "\(configuration.baseURL)/videos/")!
    }

    var createSession: URL {
        URL(string: "\(configuration.baseURL)/sessions/new/")!
    }


    func session(_ id: String) -> URL {
        URL(string: "\(configuration.baseURL)/sessions/\(id)/")!
    }

    func trial(id: String) -> URL {
        URL(string: "\(configuration.baseURL)/trials/\(id)/")!
    }

    func setSubject(id: String) -> URL {
        URL(string: "\(session(id))set_subject/")!
    }

    func startRecording(id: String) -> URL {
        URL(string: "\(session(id))record/")!
    }

    func stopRecording(id: String) -> URL {
        URL(string: "\(session(id))stop/")!
    }

    func sessionStatus(id: String) -> URL {
        URL(string: "\(session(id))status/")!
    }

    func calibrationImg(id: String) -> URL {
        URL(string: "\(session(id))calibration_img/")!
    }

    func setMetadata(id: String) -> URL {
        URL(string: "\(session(id))set_metadata/")!
    }

    func neutralImg(id: String) -> URL {
        URL(string: "\(session(id))neutral_img/")!
    }

    func calibratedCameras(id: String) -> URL {
        URL(string: "\(session(id))get_n_calibrated_cameras/")!
    }

    func invokeAnalysis(functionId: String) -> URL {
        URL(string: "\(configuration.baseURL)/analysis-functions/\(functionId)/invoke/")!
    }

    func analysisResult(taskId: String) -> URL {
        URL(string: "\(configuration.baseURL)/analysis-result/\(taskId)/")!
    }
}
