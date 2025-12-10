import Foundation

struct MotToCSVConverter {
    let delimiter: String

    init(delimiter: String = ",") {
        self.delimiter = delimiter
    }

    func convert(_ motData: Data) throws -> Data {
        guard let content = String(data: motData, encoding: .utf8) else {
            throw ModelHealthError.dataFile(.invalidEncoding)
        }

        let csvString = try convertToCSV(content)

        guard let csvData = csvString.data(using: .utf8) else {
            throw ModelHealthError.dataFile(.invalidEncoding)
        }

        return csvData
    }
}

// MARK: - Private Implementation
extension MotToCSVConverter {
    private func convertToCSV(_ content: String) throws -> String {
        formatAsCSV(
            try MotParser().parse(
                lines: content.components(separatedBy: .newlines)
            )
        )
    }

    private func formatAsCSV(_ result: ParseResult) -> String {
        var output = [String]()

        output.append(result.labels.joined(separator: delimiter))

        for row in result.rows {
            let rowString = row.map { String($0) }.joined(separator: delimiter)
            output.append(rowString)
        }

        return output.joined(separator: "\n")
    }
}

// MARK: - Supporting Types

private struct ParseResult {
    let header: [String: String]
    let labels: [String]
    let rows: [[Double]]
}

// MARK: - Parser

private struct MotParser {
    private let commentPrefixes = ["#", "//", "%"]

    func parse(lines: [String]) throws -> ParseResult {
        let (header, afterHeaderIndex) = parseHeader(lines: lines)
        let (labels, dataStartIndex) = try findLabelsAndDataStart(
            lines: lines,
            from: afterHeaderIndex
        )
        let rows = try parseDataRows(
            lines: lines,
            from: dataStartIndex,
            expectedColumns: labels.count
        )

        return ParseResult(header: header, labels: labels, rows: rows)
    }

    // MARK: - Header Parsing

    private func parseHeader(lines: [String]) -> (header: [String: String], nextIndex: Int) {
        var header: [String: String] = [:]
        var index = 0

        while index < lines.count && isCommentOrBlank(lines[index]) {
            index += 1
        }

        while index < lines.count {
            let line = lines[index].trimmingCharacters(in: .whitespaces)

            guard !line.isEmpty else {
                index += 1
                continue
            }

            if line.lowercased().hasPrefix("endheader") {
                index += 1
                break
            }

            if line.contains("=") {
                let parts = line.split(separator: "=", maxSplits: 1)
                if parts.count == 2 {
                    let key = parts[0].trimmingCharacters(in: .whitespaces)
                    let value = parts[1].trimmingCharacters(in: .whitespaces)
                    header[key] = value
                }
                index += 1
                continue
            }

            let tokens = splitOnWhitespace(line)
            if !tokens.isEmpty && tokens.contains(where: { $0.rangeOfCharacter(from: .letters) != nil }) {
                break
            }

            break
        }

        return (header, index)
    }

    // MARK: - Label Detection

    private func findLabelsAndDataStart(
        lines: [String],
        from startIndex: Int
    ) throws -> (labels: [String], dataStartIndex: Int) {
        var index = startIndex

        while index < lines.count && isCommentOrBlank(lines[index]) {
            index += 1
        }

        guard index < lines.count else {
            throw ModelHealthError.dataFile(.emptyFile)
        }

        let firstNonBlank = lines[index].trimmingCharacters(in: .whitespaces)
        let tokens = splitOnWhitespace(firstNonBlank)

        if tokens.contains(where: { $0.rangeOfCharacter(from: .letters) != nil }) {
            return (tokens, index + 1)
        }

        let labels = try synthesizeLabels(lines: lines, from: index)
        return (labels, index)
    }

    private func synthesizeLabels(lines: [String], from dataStartIndex: Int) throws -> [String] {
        var index = dataStartIndex
        while index < lines.count && isCommentOrBlank(lines[index]) {
            index += 1
        }

        guard index < lines.count else {
            throw ModelHealthError.dataFile(.couldNotDetermineCSVColumns)
        }

        let firstRow = try parseNumericRow(lines[index])
        let columnCount = firstRow.count

        var labels = ["time"]
        labels += (1..<columnCount).map { "col\($0)" }
        return labels
    }

    // MARK: - Data Parsing

    private func parseDataRows(
        lines: [String],
        from startIndex: Int,
        expectedColumns: Int
    ) throws -> [[Double]] {
        var rows: [[Double]] = []

        for line in lines[startIndex...] {
            if isCommentOrBlank(line) {
                continue
            }

            guard let values = try? parseNumericRow(line) else {
                continue
            }

            let adjustedValues = adjustRowLength(values, to: expectedColumns)
            rows.append(adjustedValues)
        }

        return rows
    }

    private func adjustRowLength(_ values: [Double], to expectedColumns: Int) -> [Double] {
        if values.count > expectedColumns {
            return Array(values.prefix(expectedColumns))
        } else if values.count < expectedColumns {
            return values + Array(repeating: 0.0, count: expectedColumns - values.count)
        }
        return values
    }

    private func parseNumericRow(_ line: String) throws -> [Double] {
        var cleanLine = line
        for prefix in commentPrefixes {
            if let range = line.range(of: prefix) {
                cleanLine = String(line[..<range.lowerBound])
                break
            }
        }

        let tokens = splitOnWhitespace(cleanLine.trimmingCharacters(in: .whitespaces))

        guard !tokens.isEmpty else {
            throw ModelHealthError.dataFile(.emptyFile)
        }

        return try tokens.map { token in
            guard let value = Double(token) else {
                throw ModelHealthError.dataFile(.emptyFile)
            }

            return value
        }
    }

    // MARK: - Utilities

    private func splitOnWhitespace(_ string: String) -> [String] {
        return string.split(whereSeparator: \.isWhitespace).map { String($0) }
    }

    private func isCommentOrBlank(_ line: String) -> Bool {
        let trimmed = line.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else {
            return true
        }

        return commentPrefixes.contains { trimmed.hasPrefix($0) }
    }
}
