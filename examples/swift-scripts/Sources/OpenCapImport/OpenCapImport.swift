/// Model Health Swift examples — import an OpenCap session into Model Health.
///
/// Mirrors examples/python/opencap_import.py.
///
/// Usage:
///   swift run OpenCapImport [<api_key>] [<opencap_session_id>] [<opencap_token>]
///
/// Arguments are resolved from CLI args, .env file, or environment variables:
///   MODEL_HEALTH_API_KEY  — Model Health API key
///   OPENCAP_SESSION_ID   — OpenCap session UUID
///   OPENCAP_TOKEN        — OpenCap authentication token (or prompted via login)
///
/// Edit meta_overrides and trialMetaOverrides below to customise the import.

import Foundation
import ModelHealth
import Shared

// MARK: - Configuration (edit here)

/// Override or extend session settings copied from the source OpenCap session.
/// Set to nil to keep the source session's values.
private let metaOverrides: [String: String]? = [
    "openSimModel":   "LaiUhlrich2022_shoulder", // "LaiUhlrich2022_shoulder" | "LaiUhlrich2022"
    "scalingsetup":   "upright_standing_pose",   // "upright_standing_pose" | "any_pose"
    "coreengine":     "v1.0",                    // "v0.2" | "v0.3" | "v1.0"
    "filterfrequency": "default",                // "default" | integer Hz as string
]

/// Per-trial overrides keyed by trial name. Assign an ActivityType to trigger
/// automatic analysis after processing. Leave empty to use no overrides.
///
/// Example:
///   private let trialMetaOverrides: [String: ActivityType?] = [
///       "trial1": .rangeOfMotion,
///       "trial2": .counterMovementJump,
///   ]
private let trialMetaOverrides: [String: ActivityType?] = [:]

// MARK: - Entry point

@main
struct OpenCapImport {
    static func main() async {
        let args = CommandLine.arguments

        let apiKey = loadAPIKey()
        let sessionId = resolveSessionId(args: args)
        let token = await resolveOpenCapToken(args: args)

        print("Connecting to Model Health...")
        let service: ModelHealthService
        do {
            service = try ModelHealthService(apiKey: apiKey)
        } catch {
            fputs("Failed to initialise: \(error)\n", stderr)
            exit(1)
        }

        let session = await copySession(
            service: service,
            sessionId: sessionId,
            token: token
        )
        await waitForActivities(service: service, session: session)
        print("Import complete. Session ID: \(session.id)")
    }
}

// MARK: - Copy session

private func copySession(
    service: ModelHealthService,
    sessionId: String,
    token: String,
    apiURL: String = "https://api.opencap.ai/"
) async -> Session {
    // Fetch source session
    print("Fetching OpenCap session \(sessionId)...")
    let sourceSession: [String: Any]
    do {
        sourceSession = try await fetchOpenCapSession(id: sessionId, token: token, baseURL: apiURL)
    } catch {
        fputs("Failed to fetch OpenCap session: \(error)\n", stderr)
        exit(1)
    }

    // Build SessionConfig from source settings + overrides
    var settings = (sourceSession["meta"] as? [String: Any] ?? [:])["settings"] as? [String: String] ?? [:]
    metaOverrides.map { settings.merge($0) { _, new in new } }
    if metaOverrides != nil { print("Applying settings overrides.") }

    let config = SessionConfig(
        opensimModel: openSimModel(from: settings["openSimModel"]),
        scalingSetup: scalingSetup(from: settings["scalingsetup"]),
        coreEngine: coreEngine(from: settings["coreengine"]),
        filterFrequency: filterFrequency(from: settings["filterfrequency"])
    )
    print("Session settings configured.")

    // Subject
    let subjects: [Subject]
    do {
        subjects = try await service.subjectList()
    } catch {
        fputs("Failed to fetch subjects: \(error)\n", stderr)
        exit(1)
    }

    let subject: Subject
    if !subjects.isEmpty, confirm("Found \(subjects.count) subject(s). Select an existing one?", default: true) {
        print()
        subject = pickOne(from: subjects, prompt: "Select subject", label: { "\($0.name)  (ID \($0.id))" })
        print("  Using: \(subject.name)")
    } else {
        print("Fetching subject from OpenCap session...")
        let subjectId = sourceSession["subject"] as? String ?? ""
        let subjectData: [String: Any]
        do {
            subjectData = try await fetchOpenCapSubject(id: subjectId, token: token, baseURL: apiURL)
        } catch {
            fputs("Failed to fetch OpenCap subject: \(error)\n", stderr)
            exit(1)
        }
        let name = (subjectData["name"] as? String ?? subjectData["first_name"] as? String ?? "").nonEmpty ?? "Unknown"
        let weight = (subjectData["weight"] as? Double) ?? Double(subjectData["weight"] as? String ?? "") ?? 0
        let heightM = (subjectData["height"] as? Double) ?? Double(subjectData["height"] as? String ?? "") ?? 0
        let birthYear = subjectData["birth_year"] as? Int
        let params = SubjectParameters(name: name, weight: weight, height: heightM * 100, birthYear: birthYear)
        do {
            subject = try await service.createSubject(parameters: params)
        } catch {
            fputs("Failed to create subject: \(error)\n", stderr)
            exit(1)
        }
        print("Subject created successfully.")
    }

    // Resolve calibration trial
    let trials = (sourceSession["trials"] as? [[String: Any]] ?? [])
        .sorted { ($0["created_at"] as? String ?? "") < ($1["created_at"] as? String ?? "") }

    var calibrationTrial: [String: Any]? = nil
    let meta = sourceSession["meta"] as? [String: Any] ?? [:]
    if let parentId = (meta["sessionWithCalibration"] as? [String: Any])?["id"] as? String {
        if let parentSession = try? await fetchOpenCapSession(id: parentId, token: token, baseURL: apiURL) {
            calibrationTrial = pickTrial(from: (parentSession["trials"] as? [[String: Any]] ?? []),
                                         matching: { $0 == "calibration" })
            if calibrationTrial != nil { print("Using calibration from parent session \(parentId).") }
        }
    }
    if calibrationTrial == nil {
        calibrationTrial = pickTrial(from: trials, matching: { $0 == "calibration" })
    }

    guard let calibration = calibrationTrial else {
        fputs("No calibration trial found, cannot proceed.\n", stderr)
        exit(1)
    }
    guard (calibration["status"] as? String) == "done" else {
        fputs("Calibration trial is not done, cannot proceed.\n", stderr)
        exit(1)
    }

    guard let neutral = pickTrial(from: trials, matching: { $0.contains("neutral") }) else {
        fputs("No neutral trial found, cannot proceed.\n", stderr)
        exit(1)
    }
    guard (neutral["status"] as? String) == "done" else {
        fputs("Neutral trial is not done, cannot proceed.\n", stderr)
        exit(1)
    }

    let dynamicTrials = trials.filter { t in
        let name = (t["name"] as? String ?? "").lowercased()
        return name != "calibration" && name != "neutral"
    }

    // Annotate dynamic trials with activity_type overrides
    let annotated: [[String: Any]] = dynamicTrials.map { trial in
        var t = trial
        let name = t["name"] as? String ?? ""
        if let override = trialMetaOverrides[name], let activityType = override {
            t["activity_type"] = activityType.rawValue
        }
        return t
    }

    // Import
    let allTrials: [[String: Any]] = [calibration, neutral] + annotated
    let activitiesJson: String
    do {
        let data = try JSONSerialization.data(withJSONObject: allTrials)
        activitiesJson = String(data: data, encoding: .utf8)!
    } catch {
        fputs("Failed to serialise trial data: \(error)\n", stderr)
        exit(1)
    }

    var seenUploads: [String: Int] = [:]
    var currentTrial: String? = nil

    print("Importing session...")
    let importedSession: Session
    do {
        importedSession = try await service.importSession(activitiesJson, subject: subject, config: config) { status in
            switch status {
            case .creatingSession:
                print("  Creating session...")
            case .createdSession(let sid):
                print("  Session created: \(sid)")
            case .uploadingVideo(let trial, let uploaded, let total):
                currentTrial = trial
                if seenUploads[trial] != uploaded {
                    seenUploads[trial] = uploaded
                    print("  [\(trial)] Uploading video \(uploaded + 1)/\(total)...")
                }
            case .processing:
                let t = currentTrial ?? "activity"
                print("  [\(t)] Processing...")
            }
        }
    } catch {
        fputs("Import failed: \(error)\n", stderr)
        exit(1)
    }

    print("All activities imported successfully to session: \(importedSession.id)")
    return importedSession
}

// MARK: - Wait for activities

private func waitForActivities(service: ModelHealthService, session: Session) async {
    var pending = session.activities.filter { a in
        let name = (a.name ?? "").lowercased()
        return name != "calibration" && name != "neutral"
    }

    guard !pending.isEmpty else { return }

    print("Waiting for activities to process...")
    var analyzing: [(Activity, Analysis)] = []

    while !pending.isEmpty {
        var stillPending: [Activity] = []
        for activity in pending {
            let status: ActivityStatus
            do {
                status = try await service.activityStatus(for: activity)
            } catch {
                print("  [\(activity.name ?? activity.id)] Status check failed: \(error)")
                continue
            }

            switch status {
            case .uploading(let uploaded, let total):
                print("  [\(activity.name ?? activity.id)] Uploading (\(uploaded)/\(total))...")
                stillPending.append(activity)
            case .processing:
                print("  [\(activity.name ?? activity.id)] Processing...")
                stillPending.append(activity)
            case .analyzing(let task):
                print("  [\(activity.name ?? activity.id)] Analyzing — queued for analysis poll.")
                analyzing.append((activity, task))
            case .ready:
                print("  [\(activity.name ?? activity.id)] Ready.")
            case .failed:
                print("  [\(activity.name ?? activity.id)] Failed.")
            }
        }
        if !stillPending.isEmpty {
            try? await Task.sleep(nanoseconds: 5_000_000_000)
        }
        pending = stillPending
    }

    guard !analyzing.isEmpty else { return }

    print("Waiting for analyses to complete...")
    var pendingAnalysis = analyzing
    while !pendingAnalysis.isEmpty {
        var stillPending: [(Activity, Analysis)] = []
        for (activity, task) in pendingAnalysis {
            let status: AnalysisStatus
            do {
                status = try await service.analysisStatus(for: task)
            } catch {
                print("  [\(activity.name ?? activity.id)] Analysis status check failed: \(error)")
                continue
            }

            switch status {
            case .processing:
                print("  [\(activity.name ?? activity.id)] Analyzing...")
                stillPending.append((activity, task))
            case .completed:
                print("  [\(activity.name ?? activity.id)] Analysis complete.")
            case .failed:
                print("  [\(activity.name ?? activity.id)] Analysis failed.")
            }
        }
        if !stillPending.isEmpty {
            try? await Task.sleep(nanoseconds: 5_000_000_000)
        }
        pendingAnalysis = stillPending
    }
}

// MARK: - OpenCap API

private func fetchOpenCapSession(id: String, token: String, baseURL: String, retries: Int = 3) async throws -> [String: Any] {
    var lastError: Error = URLError(.badServerResponse)
    for attempt in 0..<retries {
        do {
            var request = URLRequest(url: URL(string: "\(baseURL)sessions/\(id)/")!)
            request.setValue("Token \(token)", forHTTPHeaderField: "Authorization")
            let (data, response) = try await URLSession.shared.data(for: request)
            if (response as? HTTPURLResponse)?.statusCode == 500 {
                throw ScriptError("No server response. Likely not a valid session ID.")
            }
            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                throw ScriptError("Unexpected response format.")
            }
            guard json["trials"] != nil else {
                throw ScriptError("Session not found or not accessible.")
            }
            return json
        } catch {
            lastError = error
            if attempt < retries - 1 {
                print("Connection error fetching session, retrying in 5s: \(error)")
                try? await Task.sleep(nanoseconds: 5_000_000_000)
            }
        }
    }
    throw lastError
}

private func fetchOpenCapSubject(id: String, token: String, baseURL: String, retries: Int = 3) async throws -> [String: Any] {
    var lastError: Error = URLError(.badServerResponse)
    for attempt in 0..<retries {
        do {
            var request = URLRequest(url: URL(string: "\(baseURL)subjects/\(id)/")!)
            request.setValue("Token \(token)", forHTTPHeaderField: "Authorization")
            let (data, response) = try await URLSession.shared.data(for: request)
            if (response as? HTTPURLResponse)?.statusCode == 500 {
                throw ScriptError("No server response. Likely not a valid subject ID.")
            }
            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                throw ScriptError("Unexpected response format.")
            }
            return json
        } catch {
            lastError = error
            if attempt < retries - 1 {
                print("Connection error fetching subject, retrying in 5s: \(error)")
                try? await Task.sleep(nanoseconds: 5_000_000_000)
            }
        }
    }
    throw lastError
}

private func opencapLogin() async -> String {
    print("No OpenCap token found in .env or environment.")
    print("Log in with the credentials you use at app.opencap.ai.\n")
    print("OpenCap username: ", terminator: "")
    let username = readLine()?.trimmingCharacters(in: .whitespaces) ?? ""
    print("OpenCap password: ", terminator: "")
    let password = readLine()?.trimmingCharacters(in: .whitespaces) ?? ""

    let encoded = "username=\(username.urlQueryEncoded)&password=\(password.urlQueryEncoded)"
    var request = URLRequest(url: URL(string: "https://api.opencap.ai/login/")!)
    request.httpMethod = "POST"
    request.httpBody = encoded.data(using: .utf8)
    request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

    do {
        let (data, _) = try await URLSession.shared.data(for: request)
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let token = json["token"] as? String else {
            fputs("OpenCap login failed: unexpected response.\n", stderr)
            exit(1)
        }
        return token
    } catch {
        fputs("OpenCap login failed: \(error)\n", stderr)
        exit(1)
    }
}

// MARK: - CLI helpers

private func resolveSessionId(args: [String]) -> String {
    if args.count > 2, !args[2].isEmpty { return args[2] }
    if let id = dotEnvValue(for: "OPENCAP_SESSION_ID") { return id }
    if let id = ProcessInfo.processInfo.environment["OPENCAP_SESSION_ID"] { return id }
    print("OpenCap session ID: ", terminator: "")
    guard let id = readLine()?.trimmingCharacters(in: .whitespaces), !id.isEmpty else {
        fputs("OpenCap session ID is required.\n", stderr)
        exit(1)
    }
    return id
}

private func resolveOpenCapToken(args: [String]) async -> String {
    if args.count > 3, !args[3].isEmpty { return args[3] }
    if let token = dotEnvValue(for: "OPENCAP_TOKEN") { return token }
    if let token = ProcessInfo.processInfo.environment["OPENCAP_TOKEN"] { return token }
    return await opencapLogin()
}

// MARK: - Settings mapping

private func openSimModel(from string: String?) -> SessionOpenSimModel {
    switch string {
    case "LaiUhlrich2022": return .laiUhlrich2022
    default: return .laiUhlrich2022Shoulder
    }
}

private func scalingSetup(from string: String?) -> SessionScalingSetup {
    switch string {
    case "any_pose": return .anyPose
    default: return .uprightStandingPose
    }
}

private func coreEngine(from string: String?) -> SessionCoreEngine {
    switch string {
    case "v0.2": return .v0_2
    case "v0.3": return .v0_3
    default: return .v1_0
    }
}

private func filterFrequency(from string: String?) -> FilterFrequency {
    guard let s = string, s != "default", let hz = Int(s) else { return .default }
    return .hz(hz)
}

private func pickTrial(from trials: [[String: Any]], matching predicate: (String) -> Bool) -> [String: Any]? {
    let matches = trials.filter { predicate(($0["name"] as? String ?? "").lowercased()) }
    let done = matches.filter { ($0["status"] as? String) == "done" }
    let pool = done.isEmpty ? matches : done
    return pool.max(by: { ($0["created_at"] as? String ?? "") < ($1["created_at"] as? String ?? "") })
}

// MARK: - Helpers

private struct ScriptError: Error, CustomStringConvertible {
    let description: String
    init(_ message: String) { description = message }
}

private extension String {
    var nonEmpty: String? { isEmpty ? nil : self }
    var urlQueryEncoded: String {
        addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? self
    }
}
