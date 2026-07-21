import Foundation
import ModelHealth

// MARK: - Constants

public let internalActivityNames: Set<String> = ["calibration", "neutral"]

// MARK: - API key

public func loadAPIKey() -> String {
    let args = CommandLine.arguments
    if args.count > 1, !args[1].isEmpty {
        return args[1]
    }
    if let key = dotEnvValue(for: "MODEL_HEALTH_API_KEY") {
        return key
    }
    if let key = ProcessInfo.processInfo.environment["MODEL_HEALTH_API_KEY"] {
        return key
    }
    fputs(
        "Model Health API key not found.\n"
            + "Provide it as a CLI argument or set MODEL_HEALTH_API_KEY in .env or your environment.\n",
        stderr
    )
    exit(1)
}

public func dotEnvValue(for key: String) -> String? {
    let envURL = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        .appendingPathComponent(".env")
    guard let contents = try? String(contentsOf: envURL, encoding: .utf8) else {
        return nil
    }

    for line in contents.components(separatedBy: .newlines) {
        let trimmed = line.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty, !trimmed.hasPrefix("#") else {
            continue
        }

        let parts = trimmed.components(separatedBy: "=")
        guard parts.count >= 2, parts[0].trimmingCharacters(in: .whitespaces) == key else {
            continue
        }

        var value = parts.dropFirst().joined(separator: "=").trimmingCharacters(in: .whitespaces)
        if value.count >= 2,
           (value.hasPrefix("\"") && value.hasSuffix("\"")) || (value.hasPrefix("'") && value.hasSuffix("'"))
        {
            value = String(value.dropFirst().dropLast())
        }
        return value.isEmpty ? nil : value
    }
    return nil
}

// MARK: - File I/O

public var downloadsURL: URL {
    URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        .appendingPathComponent("downloads")
}

@discardableResult
public func saveFile(named filename: String, data: Data) -> String {
    let dir = downloadsURL
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    let url = dir.appendingPathComponent(filename)
    do {
        try data.write(to: url)
    } catch {
        fputs("Could not save \(filename): \(error)\n", stderr)
    }
    return url.path
}

// MARK: - Polling

public func pollAnalysis(service: ModelHealthService, task: Analysis) async throws -> AnalysisStatus {
    while true {
        let status = try await service.analysisStatus(for: task)
        if case .processing = status {
            print("  Analysing...  ", terminator: "\r")
            fflush(stdout)
        } else {
            print()
            return status
        }
        try await Task.sleep(nanoseconds: 10_000_000_000)
    }
}

// MARK: - Prompts

public func pickOne<T>(from items: [T], prompt: String, label: (T) -> String, defaultIndex: Int? = nil) -> T {
    for (index, item) in items.enumerated() {
        let suffix = index == defaultIndex ? "  (default)" : ""
        print("  \(index + 1). \(label(item))\(suffix)")
    }

    let rangeHint: String
    if let defaultIndex {
        rangeHint = "1–\(items.count), Enter for \(defaultIndex + 1)"
    } else {
        rangeHint = "1–\(items.count)"
    }

    while true {
        print("\n\(prompt) (\(rangeHint)): ", terminator: "")
        let line = readLine()?.trimmingCharacters(in: .whitespaces) ?? ""
        if line.isEmpty, let defaultIndex {
            return items[defaultIndex]
        }
        if let num = Int(line), (1...items.count).contains(num) {
            return items[num - 1]
        }
        print("  Please enter a number between 1 and \(items.count).")
    }
}

public func pickMulti<T>(from items: [T], prompt: String, label: (T) -> String) -> [T] {
    for (index, item) in items.enumerated() {
        print("  \(index + 1). \(label(item))")
    }
    while true {
        print("\n\(prompt) (e.g. 1 2 3): ", terminator: "")
        if let line = readLine() {
            let indices = line.split(separator: " ").compactMap { Int($0) }.map { $0 - 1 }
            let selected = indices.compactMap { (0..<items.count).contains($0) ? items[$0] : nil }
            if !selected.isEmpty {
                return selected
            }
        }
        print("  Please enter one or more numbers between 1 and \(items.count).")
    }
}

public func confirm(_ prompt: String, default defaultValue: Bool? = nil) -> Bool {
    let hint: String
    if defaultValue == true {
        hint = "[Y/n]"
    } else if defaultValue == false {
        hint = "[y/N]"
    } else {
        hint = "[y/n]"
    }

    while true {
        print("\(prompt) \(hint): ", terminator: "")
        let raw = readLine()?.trimmingCharacters(in: .whitespaces).lowercased() ?? ""
        if raw == "y" || raw == "yes" {
            return true
        }

        if raw == "n" || raw == "no" {
            return false
        }

        if raw.isEmpty, let defaultVal = defaultValue {
            return defaultVal
        }

        print("  Please enter y or n.")
    }
}

// MARK: - MotionDataType helpers

public extension MotionDataType {
    var fileExtension: String {
        switch self {
        case .animation: return "json"
        case .kinematics(.mot): return "mot"
        case .kinematics(.csv): return "csv"
        case .markers(.trc): return "trc"
        case .markers(.csv): return "csv"
        case .model: return "osim"
        case .tagged(_, let ext): return ext
        }
    }

    var typeLabel: String {
        switch self {
        case .animation: return "animation"
        case .kinematics(.mot): return "kinematics_mot"
        case .kinematics(.csv): return "kinematics_csv"
        case .markers(.trc): return "markers_trc"
        case .markers(.csv): return "markers_csv"
        case .model: return "model"
        case .tagged(let tag, _): return tag
        }
    }
}

// MARK: - AnalysisDataType helpers

public extension AnalysisDataType {
    var fileExtension: String {
        switch self {
        case .metrics: return "json"
        case .report: return "pdf"
        case .data: return "zip"
        }
    }

    var typeLabel: String {
        switch self {
        case .metrics: return "metrics"
        case .report: return "report"
        case .data: return "data"
        }
    }
}
