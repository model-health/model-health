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
    CheckerboardPreset(rows: nil, columns: nil, squareSize: nil, label: "Other — enter manually"),
]

private struct ActivityTypeOption {
    let type: ActivityType?
    let label: String
}

private let activityTypeOptions: [ActivityTypeOption] = [
    ActivityTypeOption(type: nil,                     label: "None — skip automatic analysis"),
    ActivityTypeOption(type: .counterMovementJump,    label: "Counter Movement Jump"),
    ActivityTypeOption(type: .gait,                   label: "Overground Walking"),
    ActivityTypeOption(type: .treadmillGait,          label: "Treadmill Walking"),
    ActivityTypeOption(type: .treadmillRunning,       label: "Treadmill Running"),
    ActivityTypeOption(type: .overgroundRunning,      label: "Overground Running"),
    ActivityTypeOption(type: .sitToStand,             label: "Sit-to-Stand Transfer"),
    ActivityTypeOption(type: .squats,                 label: "Squats"),
    ActivityTypeOption(type: .rangeOfMotion,          label: "Range of Motion"),
    ActivityTypeOption(type: .dropJump,               label: "Drop Vertical Jump"),
    ActivityTypeOption(type: .hop,                    label: "Hop Test"),
    ActivityTypeOption(type: .changeOfDirection,      label: "5-0-5 Test"),
    ActivityTypeOption(type: .cut,                    label: "Cutting Maneuver"),
    ActivityTypeOption(type: .sprint,                 label: "Sprint"),
    ActivityTypeOption(type: .lateralStepdown,        label: "Lateral Step Down"),
    ActivityTypeOption(type: .lunge,                  label: "Lunge"),
]

private struct FramerateOption {
    let value: SessionFramerate?
    let label: String
}

private let framerateOptions: [FramerateOption] = [
    FramerateOption(value: nil,     label: "Default"),
    FramerateOption(value: .fps60,  label: "60 fps"),
    FramerateOption(value: .fps120, label: "120 fps"),
    FramerateOption(value: .fps240, label: "240 fps"),
]

private struct FilterFrequencyOption {
    let value: FilterFrequency?
    let label: String
}

private let filterFrequencyOptions: [FilterFrequencyOption] = [
    FilterFrequencyOption(value: nil,        label: "Default"),
    FilterFrequencyOption(value: .hz(6),     label: "6 Hz"),
    FilterFrequencyOption(value: .hz(10),    label: "10 Hz"),
    FilterFrequencyOption(value: .hz(20),    label: "20 Hz"),
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

@main
struct ActivityRecording {
    static func main() async {
        print("Connecting...")
        let service: ModelHealthService
        do {
            service = try ModelHealthService(apiKey: loadAPIKey())
        } catch {
            fputs("Failed to initialise: \(error)\n", stderr)
            exit(1)
        }

        // Session
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

        print("  Pair your cameras using the Model Health companion iOS app before continuing.")
        print("\nPress Enter when cameras are ready...", terminator: "")
        _ = readLine()

        // Camera calibration
        print("\nCheckerboard configuration:\n")
        let preset = pickOne(from: checkerboardPresets, prompt: "Select checkerboard", label: { $0.label })

        let rows: Int
        let columns: Int
        let squareSize: Int

        if let r = preset.rows, let c = preset.columns, let s = preset.squareSize {
            rows = r
            columns = c
            squareSize = s
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
            label: { p in
                switch p {
                case .perpendicular: return "Perpendicular (upright, facing cameras)"
                case .parallel: return "Parallel (flat on the floor)"
                }
            }
        )

        let checkerboard = CheckerboardDetails(
            rows: rows,
            columns: columns,
            squareSize: squareSize,
            placement: placement
        )

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

        // Subject
        print("\nFetching subjects...")
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
            print("\nNew subject details:")
            print("  Name: ", terminator: "")
            let name = readLine()?.trimmingCharacters(in: .whitespaces).nonEmpty ?? "Anonymous"
            print("  Weight (kg): ", terminator: "")
            let weight = Double(readLine()?.trimmingCharacters(in: .whitespaces) ?? "") ?? 0
            print("  Height (cm): ", terminator: "")
            let height = Double(readLine()?.trimmingCharacters(in: .whitespaces) ?? "") ?? 0

            let params = SubjectParameters(name: name, weight: weight, height: height)
            print("Creating subject...")
            do {
                subject = try await service.createSubject(parameters: params)
            } catch {
                fputs("Failed to create subject: \(error)\n", stderr)
                exit(1)
            }
            print("  Subject created: \(subject.name) (ID \(subject.id))")
        }

        // Subject calibration
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

        // Recording loop
        repeat {
            await recordOne(service: service, session: session, subject: subject)
        } while confirm("\nRecord another activity?", default: true)

        print("\nDone.")
    }
}

// MARK: - Recording cycle

private func recordOne(service: ModelHealthService, session: Session, subject: Subject) async {
    print("\nActivity name (e.g. cmj, squat): ", terminator: "")
    let activityName = readLine()?.trimmingCharacters(in: .whitespaces).nonEmpty ?? "activity"

    print("\nAutomatic analysis (optional):\n")
    let selectedType = pickOne(from: activityTypeOptions, prompt: "Select activity type", label: { $0.label })

    print("\nFramerate override (optional):\n")
    let selectedFramerate = pickOne(from: framerateOptions, prompt: "Select framerate", label: { $0.label })

    print("\nFilter frequency override (optional):\n")
    let selectedFilter = pickOne(from: filterFrequencyOptions, prompt: "Select filter frequency", label: { $0.label })

    var recordingConfig: RecordingConfig? = nil
    if selectedFramerate.value != nil || selectedFilter.value != nil {
        recordingConfig = RecordingConfig(framerate: selectedFramerate.value, filterFrequency: selectedFilter.value)
    }

    let activityConfig = ActivityConfig(activityType: selectedType.type, config: recordingConfig)

    print("\nAsk \(subject.name) to get ready, then press Enter to start recording...", terminator: "")
    _ = readLine()
    print("Recording...")
    let activity: Activity
    do {
        activity = try await service.startRecording(activityNamed: activityName, in: session, config: activityConfig)
    } catch {
        fputs("Failed to start recording: \(error)\n", stderr)
        return
    }
    print("  Recording started (activity \(activity.id)).")

    print("\nPress Enter when the movement is complete to stop recording...", terminator: "")
    _ = readLine()
    print("Stopping recording...")
    do {
        try await service.stopRecording(session)
    } catch {
        fputs("Failed to stop recording: \(error)\n", stderr)
        return
    }
    print("Recording stopped. Videos are uploading.")

    // Wait for processing
    print("\nWaiting for upload and processing...")
    let finalStatus = await pollActivity(service: service, activity: activity)

    var currentActivity = activity

    if case .analyzing(let task) = finalStatus {
        let typeLabel = selectedType.label
        print("Activity is ready. Automatic '\(typeLabel)' analysis has started.")
        print("\nWaiting for analysis to complete...")
        let analysisResult: AnalysisStatus
        do {
            analysisResult = try await pollAnalysis(service: service, task: task)
        } catch {
            fputs("Analysis polling failed: \(error)\n", stderr)
            return
        }

        guard case .completed = analysisResult else {
            print("Analysis did not complete (status: \(analysisResult)).")
            return
        }
        print("Analysis complete.")

        let freshActivity: Activity
        do {
            freshActivity = try await service.fetch(activity: activity.id)
        } catch {
            fputs("Failed to re-fetch activity: \(error)\n", stderr)
            return
        }
        currentActivity = freshActivity

        let results = await service.analysisData(ofType: [.report], for: freshActivity)
        let slug = (freshActivity.name ?? freshActivity.id).replacingOccurrences(of: " ", with: "_")
        print("\nDownloading report...")
        for r in results {
            let path = saveFile(named: "\(slug)_\(r.type.typeLabel).\(r.type.fileExtension)", data: r.data)
            print("  Saved \(path)")
        }
    } else if case .ready = finalStatus {
        print("Activity is ready. ID: \(activity.id)")
        print("Run ActivityAnalysis to analyze this activity.")
    } else {
        print("Activity did not reach ready state (status: \(finalStatus)).")
    }

    // Update activity metadata (optional).
    // Re-fetch first: analysis auto-generates tags server-side, and update(activity:)
    // merges add/remove tags on top of the local activity's tags. Without a fresh
    // fetch, the merge starts from a stale tag set and wipes the auto-generated tags.
    do {
        currentActivity = try await service.fetch(activity: currentActivity.id)
    } catch {
        fputs("Failed to refresh activity: \(error)\n", stderr)
    }

    print("\nUpdate activity (optional):")
    let currentTags = currentActivity.tags.isEmpty ? "(none)" : currentActivity.tags.joined(separator: ", ")
    print("  Current tags: \(currentTags)")
    print("  New name (press Enter to keep '\(currentActivity.name ?? currentActivity.id)'): ", terminator: "")
    let newName = readLine()?.trimmingCharacters(in: .whitespaces).nonEmpty
    print("  Tags to add, comma-separated (press Enter to skip): ", terminator: "")
    let addTagsRaw = readLine()?.trimmingCharacters(in: .whitespaces) ?? ""
    let addTags: [String] = addTagsRaw.isEmpty ? [] : addTagsRaw.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
    print("  Tags to remove, comma-separated (press Enter to skip): ", terminator: "")
    let removeTagsRaw = readLine()?.trimmingCharacters(in: .whitespaces) ?? ""
    let removeTags: [String] = removeTagsRaw.isEmpty ? [] : removeTagsRaw.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
    if newName != nil || !addTags.isEmpty || !removeTags.isEmpty {
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
