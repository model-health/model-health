/// Model Health Swift examples — full capture workflow.
///
/// Usage:
///   swift run ActivityRecording [<api_key>]

import Foundation
import ModelHealth
import Shared

private struct CheckerboardPreset {
    let rows: Int?
    let columns: Int?
    let squareSize: Int?
    let label: String
}

private let checkerboardPresets: [CheckerboardPreset] = [
    CheckerboardPreset(rows: 4, columns: 5, squareSize: 35, label: "4 × 5  —  35 mm squares  (standard A4)"),
    CheckerboardPreset(rows: 4, columns: 5, squareSize: 50, label: "4 × 5  —  50 mm squares  (large A3)"),
    CheckerboardPreset(rows: nil, columns: nil, squareSize: nil, label: "Other — enter manually")
]

private struct ActivityTypeOption {
    let type: ActivityType?
    let label: String
}

private let activityTypeOptions: [ActivityTypeOption] = [
    ActivityTypeOption(type: nil, label: "None — skip automatic analysis"),
    ActivityTypeOption(type: .counterMovementJump, label: "Counter Movement Jump"),
    ActivityTypeOption(type: .gait, label: "Overground Walking"),
    ActivityTypeOption(type: .treadmillGait, label: "Treadmill Walking"),
    ActivityTypeOption(type: .treadmillRunning, label: "Treadmill Running"),
    ActivityTypeOption(type: .overgroundRunning, label: "Overground Running"),
    ActivityTypeOption(type: .sitToStand, label: "Sit-to-Stand Transfer"),
    ActivityTypeOption(type: .squats, label: "Squats"),
    ActivityTypeOption(type: .rangeOfMotion, label: "Range of Motion"),
    ActivityTypeOption(type: .dropJump, label: "Drop Vertical Jump"),
    ActivityTypeOption(type: .hop, label: "Hop Test"),
    ActivityTypeOption(type: .changeOfDirection, label: "5-0-5 Test"),
    ActivityTypeOption(type: .cut, label: "Cutting Maneuver"),
    ActivityTypeOption(type: .sprint, label: "Sprint"),
    ActivityTypeOption(type: .lateralStepdown, label: "Lateral Step Down"),
    ActivityTypeOption(type: .lunge, label: "Lunge")
]

private struct FramerateOption {
    let value: SessionFramerate?
    let label: String
}

private let framerateOptions: [FramerateOption] = [
    FramerateOption(value: nil, label: "Default"),
    FramerateOption(value: .fps60, label: "60 fps"),
    FramerateOption(value: .fps120, label: "120 fps"),
    FramerateOption(value: .fps240, label: "240 fps")
]

private struct FilterFrequencyOption {
    let value: FilterFrequency?
    let label: String
}

private let filterFrequencyOptions: [FilterFrequencyOption] = [
    FilterFrequencyOption(value: nil, label: "Default"),
    FilterFrequencyOption(value: .hz(6), label: "6 Hz"),
    FilterFrequencyOption(value: .hz(10), label: "10 Hz"),
    FilterFrequencyOption(value: .hz(20), label: "20 Hz")
]

private let cbWidth = 48

private let calibrationCallback: @Sendable (CalibrationStatus) -> Void = { status in
    switch status {
    case .recording:
        let msg = "  Recording...".padding(toLength: cbWidth, withPad: " ", startingAt: 0)
        print(msg, terminator: "\r")
        fflush(stdout)

    case .uploading(let uploaded, let total):
        let msg = "  Uploading (\(uploaded)/\(total) cameras)...".padding(toLength: cbWidth, withPad: " ", startingAt: 0)
        print(msg, terminator: "\r")
        fflush(stdout)

    case .processing(let percent):
        let pct = percent.map { "\($0)%" } ?? "--%"
        let msg = "  Processing (\(pct))...".padding(toLength: cbWidth, withPad: " ", startingAt: 0)
        print(msg, terminator: "\r")
        fflush(stdout)

    case .done:
        print("  Done.".padding(toLength: cbWidth, withPad: " ", startingAt: 0))
    }
}

// MARK: - Entry point

@main
struct ActivityRecording {
    static func main() async {
        let apiKey = loadAPIKey()
        let service = connect(apiKey: apiKey)

        var session = await createSessionAndSaveQRCode(service: service)
        waitForCameraPairing()

        let checkerboard = configureCheckerboard()
        await calibrateCameras(service: service, session: session, checkerboard: checkerboard)

        repeat {
            let subject = await pickOrCreateSubject(service: service)
            await calibrateSubject(service: service, subject: subject, session: session)

            repeat {
                await recordOne(service: service, session: session, subject: subject)
            } while confirm("\nRecord another activity?", default: true)

            guard confirm("\nCalibrate another subject with the same camera setup?", default: true) else {
                break
            }
            do {
                session = try await service.newSession(from: session)
            } catch {
                print("Failed to create new session: \(error)")
                break
            }
        } while true

        print("\nDone.")
    }
}

// MARK: - Setup

private func connect(apiKey: String) -> ModelHealthService {
    print("Connecting...")
    do {
        return try ModelHealthService(apiKey: apiKey)
    } catch {
        fputs("Failed to initialise: \(error)\n", stderr)
        exit(1)
    }
}

// MARK: - Session / camera pairing

private func createSessionAndSaveQRCode(service: ModelHealthService) async -> Session {
    print("\nCreating session...")
    let session: Session
    do {
        session = try await service.createSession()
    } catch {
        fputs("Failed to create session: \(error)\n", stderr)
        exit(1)
    }
    print("  Session ID: \(session.id)")

    guard let qrcodeURLString = session.qrcode, let qrcodeURL = URL(string: qrcodeURLString) else {
        fputs("Session has no QR code — cannot pair cameras.\n", stderr)
        exit(1)
    }

    do {
        let (qrData, _) = try await URLSession.shared.data(from: qrcodeURL)
        let qrPath = saveFile(named: "qr-code.png", data: qrData)
        print("  QR code saved to: \(qrPath)")
    } catch {
        fputs("Failed to download QR code: \(error)\n", stderr)
        exit(1)
    }

    return session
}

private func waitForCameraPairing() {
    print("  Pair your cameras using the Model Health companion iOS app before continuing.")
    print("\nPress Enter when cameras are ready...", terminator: "")
    _ = readLine()
}

// MARK: - Camera calibration

private func configureCheckerboard() -> CheckerboardDetails {
    print("\nCheckerboard configuration:\n")
    let preset = pickOne(from: checkerboardPresets, prompt: "Select checkerboard", label: { $0.label })

    let rows: Int
    let columns: Int
    let squareSize: Int

    if let presetRows = preset.rows, let presetColumns = preset.columns, let presetSquareSize = preset.squareSize {
        rows = presetRows
        columns = presetColumns
        squareSize = presetSquareSize
    } else {
        print("  Internal rows: ", terminator: "")
        rows = Int(readLine()?.trimmingCharacters(in: .whitespaces) ?? "") ?? 0
        print("  Internal columns: ", terminator: "")
        columns = Int(readLine()?.trimmingCharacters(in: .whitespaces) ?? "") ?? 0
        print("  Square size (mm): ", terminator: "")
        squareSize = Int(readLine()?.trimmingCharacters(in: .whitespaces) ?? "") ?? 0
    }

    print("\nCheckerboard placement:\n")
    let placement = pickOne(
        from: [CheckerboardPlacement.perpendicular, .parallel],
        prompt: "Select placement",
        label: { placement in
            switch placement {
            case .perpendicular:
                return "Perpendicular (upright, facing cameras)"

            case .parallel:
                return "Parallel (flat on the floor)"
            }
        }
    )

    return CheckerboardDetails(rows: rows, columns: columns, squareSize: squareSize, placement: placement)
}

private func calibrateCameras(service: ModelHealthService, session: Session, checkerboard: CheckerboardDetails) async {
    print("\nPress Enter to start camera calibration...", terminator: "")
    _ = readLine()
    print("Calibrating cameras...")
    do {
        try await service.calibrateCamera(session, checkerboardDetails: checkerboard, statusUpdate: calibrationCallback)
    } catch {
        fputs("Camera calibration failed: \(error)\n", stderr)
        exit(1)
    }
    print("Camera calibration complete.")
}

// MARK: - Subject

private func pickOrCreateSubject(service: ModelHealthService) async -> Subject {
    print("\nFetching subjects...")
    let subjects: [Subject]
    do {
        subjects = try await service.subjectList()
    } catch {
        fputs("Failed to fetch subjects: \(error)\n", stderr)
        exit(1)
    }

    if !subjects.isEmpty, confirm("Found \(subjects.count) subject(s). Select an existing one?", default: true) {
        print()
        let subject = pickOne(from: subjects, prompt: "Select subject", label: { "\($0.name)  (ID \($0.id))" })
        print("  Using: \(subject.name)")
        return subject
    }

    print("\nNew subject details:")
    print("  Name: ", terminator: "")
    let name = readLine()?.trimmingCharacters(in: .whitespaces).nonEmpty ?? "Anonymous"
    print("  Weight (kg): ", terminator: "")
    let weight = Double(readLine()?.trimmingCharacters(in: .whitespaces) ?? "") ?? 0
    print("  Height (cm): ", terminator: "")
    let height = Double(readLine()?.trimmingCharacters(in: .whitespaces) ?? "") ?? 0

    let params = SubjectParameters(name: name, weight: weight, height: height)
    print("Creating subject...")
    let subject: Subject
    do {
        subject = try await service.createSubject(parameters: params)
    } catch {
        fputs("Failed to create subject: \(error)\n", stderr)
        exit(1)
    }
    print("  Subject created: \(subject.name) (ID \(subject.id))")
    return subject
}

private func calibrateSubject(service: ModelHealthService, subject: Subject, session: Session) async {
    print("\nAsk \(subject.name) to stand in the neutral pose, then press Enter...", terminator: "")
    _ = readLine()
    print("Calibrating subject...")
    do {
        try await service.calibrateSubject(subject, in: session, statusUpdate: calibrationCallback)
    } catch {
        fputs("Subject calibration failed: \(error)\n", stderr)
        exit(1)
    }
    print("Subject calibration complete.")
}

// MARK: - Recording cycle

private struct RecordingSetup {
    let name: String
    let type: ActivityTypeOption
    let config: ActivityConfig
}

private func recordOne(service: ModelHealthService, session: Session, subject: Subject) async {
    let setup = promptActivityConfig()

    guard let activity = await startRecording(service: service, session: session, subject: subject, setup: setup) else {
        return
    }

    guard await stopRecording(service: service, session: session) else {
        return
    }

    guard let currentActivity = await waitAndProcessResults(service: service, activity: activity, selectedType: setup.type) else {
        return
    }

    await promptAndApplyUpdate(service: service, activity: currentActivity)
}

private func promptActivityConfig() -> RecordingSetup {
    print("\nActivity name (e.g. cmj, squat): ", terminator: "")
    let activityName = readLine()?.trimmingCharacters(in: .whitespaces).nonEmpty ?? "activity"

    print("\nAutomatic analysis (optional):\n")
    let selectedType = pickOne(from: activityTypeOptions, prompt: "Select activity type", label: { $0.label })

    print("\nFramerate override (optional):\n")
    let selectedFramerate = pickOne(from: framerateOptions, prompt: "Select framerate", label: { $0.label })

    print("\nFilter frequency override (optional):\n")
    let selectedFilter = pickOne(from: filterFrequencyOptions, prompt: "Select filter frequency", label: { $0.label })

    var recordingConfig: RecordingConfig?
    if selectedFramerate.value != nil || selectedFilter.value != nil {
        recordingConfig = RecordingConfig(framerate: selectedFramerate.value, filterFrequency: selectedFilter.value)
    }

    let activityConfig = ActivityConfig(activityType: selectedType.type, config: recordingConfig)
    return RecordingSetup(name: activityName, type: selectedType, config: activityConfig)
}

private func startRecording(
    service: ModelHealthService,
    session: Session,
    subject: Subject,
    setup: RecordingSetup
) async -> Activity? {
    print("\nAsk \(subject.name) to get ready, then press Enter to start recording...", terminator: "")
    _ = readLine()
    print("Recording...")
    do {
        let activity = try await service.startRecording(activityNamed: setup.name, in: session, config: setup.config)
        print("  Recording started (activity \(activity.id)).")
        return activity
    } catch {
        fputs("Failed to start recording: \(error)\n", stderr)
        return nil
    }
}

private func stopRecording(service: ModelHealthService, session: Session) async -> Bool {
    print("\nPress Enter when the movement is complete to stop recording...", terminator: "")
    _ = readLine()
    print("Stopping recording...")
    do {
        try await service.stopRecording(session)
        print("Recording stopped. Videos are uploading.")
        return true
    } catch {
        fputs("Failed to stop recording: \(error)\n", stderr)
        return false
    }
}

/// Waits for the recording to finish uploading/processing and, if automatic
/// analysis was requested, waits for it to complete and downloads the report.
///
/// Returns `nil` if a failure occurred that should abort the rest of this
/// recording cycle (skipping the trailing metadata-update step); otherwise
/// returns the most up-to-date copy of the activity.
private func waitAndProcessResults(
    service: ModelHealthService,
    activity: Activity,
    selectedType: ActivityTypeOption
) async -> Activity? {
    print("\nWaiting for upload and processing...")
    let finalStatus = await pollActivity(service: service, activity: activity)

    switch finalStatus {
    case .analyzing(let task):
        return await waitForAnalysisAndDownloadReport(service: service, activity: activity, task: task, selectedType: selectedType)

    case .ready:
        print("Activity is ready. ID: \(activity.id)")
        print("Run ActivityAnalysis to analyze this activity.")
        return activity

    default:
        print("Activity did not reach ready state (status: \(finalStatus)).")
        return activity
    }
}

private func waitForAnalysisAndDownloadReport(
    service: ModelHealthService,
    activity: Activity,
    task: Analysis,
    selectedType: ActivityTypeOption
) async -> Activity? {
    print("Activity is ready. Automatic '\(selectedType.label)' analysis has started.")
    print("\nWaiting for analysis to complete...")
    let analysisResult: AnalysisStatus
    do {
        analysisResult = try await pollAnalysis(service: service, task: task)
    } catch {
        fputs("Analysis polling failed: \(error)\n", stderr)
        return nil
    }

    guard case .completed = analysisResult else {
        print("Analysis did not complete (status: \(analysisResult)).")
        return nil
    }
    print("Analysis complete.")

    let freshActivity: Activity
    do {
        freshActivity = try await service.fetch(activity: activity.id)
    } catch {
        fputs("Failed to re-fetch activity: \(error)\n", stderr)
        return nil
    }

    let results = await service.analysisData(ofType: [.report], for: freshActivity)
    let slug = (freshActivity.name ?? freshActivity.id).replacingOccurrences(of: " ", with: "_")
    print("\nDownloading report...")
    for result in results {
        let path = saveFile(named: "\(slug)_\(result.type.typeLabel).\(result.type.fileExtension)", data: result.data)
        print("  Saved \(path)")
    }

    return freshActivity
}

// MARK: - Metadata update

private func promptAndApplyUpdate(service: ModelHealthService, activity: Activity) async {
    // Re-fetch first: analysis auto-generates tags server-side, and update(activity:)
    // merges add/remove tags on top of the local activity's tags. Without a fresh
    // fetch, the merge starts from a stale tag set and wipes the auto-generated tags.
    var currentActivity = activity
    do {
        currentActivity = try await service.fetch(activity: activity.id)
    } catch {
        fputs("Failed to refresh activity: \(error)\n", stderr)
    }

    print("\nUpdate activity (optional):")
    let currentTags = currentActivity.tags.isEmpty ? "(none)" : currentActivity.tags.joined(separator: ", ")
    print("  Current tags: \(currentTags)")
    print("  New name (press Enter to keep '\(currentActivity.name ?? currentActivity.id)'): ", terminator: "")
    let newName = readLine()?.trimmingCharacters(in: .whitespaces).nonEmpty

    print("  Tags to add, comma-separated (press Enter to skip): ", terminator: "")
    let addTags = promptTagList()

    print("  Tags to remove, comma-separated (press Enter to skip): ", terminator: "")
    let removeTags = promptTagList()

    guard newName != nil || !addTags.isEmpty || !removeTags.isEmpty else {
        return
    }

    print("Updating activity...")
    do {
        let updated = try await service.update(
            activity: currentActivity,
            config: ActivityConfig(addTags: addTags, removeTags: removeTags, name: newName)
        )
        print("  Updated: \(updated.name ?? updated.id)")
    } catch {
        fputs("Failed to update activity: \(error)\n", stderr)
    }
}

private func promptTagList() -> [String] {
    let raw = readLine()?.trimmingCharacters(in: .whitespaces) ?? ""
    guard !raw.isEmpty else {
        return []
    }

    return raw.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
}

// MARK: - Polling

private func pollActivity(service: ModelHealthService, activity: Activity) async -> ActivityStatus {
    while true {
        let status: ActivityStatus
        do {
            status = try await service.activityStatus(for: activity)
        } catch {
            fputs("Failed to check activity status: \(error)\n", stderr)
            exit(1)
        }

        switch status {
        case .uploading(let uploaded, let total):
            print("  Uploading (\(uploaded)/\(total) cameras)...  ", terminator: "\r")
            fflush(stdout)
        case .processing:
            print("  Processing...                              ", terminator: "\r")
            fflush(stdout)
        default:
            print()
            return status
        }
        try? await Task.sleep(nanoseconds: 5_000_000_000)
    }
}

private extension String {
    var nonEmpty: String? { isEmpty ? nil : self }
}
