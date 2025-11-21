import Foundation

struct Configuration {
    let baseURL: String
    let analysisTypeIDs: [AnalysisType: String]

    static let production = Configuration(
        baseURL: "https://api.modelhealth.io",
        analysisTypeIDs: [
            .counterMovementJump: "36"
        ]
    )

    static func load() throws -> Configuration {
        guard let path = Bundle.main.path(forResource: "Config", ofType: "plist") else {
            return .production
        }

        guard let dict = NSDictionary(contentsOfFile: path) as? [String: Any] else {
            throw ModelHealthError.internalError("Config.plist exists but is not a valid plist")
        }

        guard let baseURL = dict["BaseURL"] as? String else {
            throw ModelHealthError.internalError("Config.plist missing or invalid BaseURL")
        }

        guard let cmjID = dict["CMJAnalysisID"] as? String else {
            throw ModelHealthError.internalError("Config.plist missing CMJAnalysisID")
        }

        return Configuration(
            baseURL: baseURL,
            analysisTypeIDs: [
                .counterMovementJump: cmjID
            ]
        )
    }
}
