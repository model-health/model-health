import SwiftUI
import ModelHealth

struct CameraCalibrationView: View {
    let session: Session

    @State private var rows: String = "4"
    @State private var columns: String = "5"
    @State private var squareSize: String = "35"
    @State private var placement: CheckerboardPlacement = .perpendicular
    @State private var isCalibrating = false

    @EnvironmentObject private var modelHealth: ModelHealthService

    var body: some View {
        NavigationView {
            Form {
                Section {
                    HStack {
                        Text("Rows")
                            .frame(width: 100, alignment: .leading)
                        TextField("4", text: $rows)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                    }

                    HStack {
                        Text("Columns")
                            .frame(width: 100, alignment: .leading)
                        TextField("5", text: $columns)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                    }

                    HStack {
                        Text("Square Size")
                            .frame(width: 100, alignment: .leading)
                        TextField("35", text: $squareSize)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                        Text("mm")
                            .foregroundColor(.secondary)
                    }
                }

                Section {
                    Picker("Placement on Floor", selection: $placement) {
                        ForEach(CheckerboardPlacement.allCases) { option in
                            Text(option.rawValue).tag(option)
                        }
                    }
                }

                Section {
                    Button {
                        Task {
                            await performCalibration()
                        }
                    } label: {
                        HStack {
                            Spacer()
                            if isCalibrating {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle())
                                    .padding(.trailing, 8)
                            } else {
                                Text("Calibrate")
                                    .fontWeight(.semibold)
                            }
                            Spacer()
                        }
                    }
                    .disabled(isCalibrating)
                    .foregroundColor(isCalibrating ? .gray : .accentColor)
                }
                .navigationTitle("Checkerboard Details")
                .navigationBarTitleDisplayMode(.inline)
            }
        }
    }

    private func performCalibration() async {
        isCalibrating = true
        defer { isCalibrating = false }

        do {
            guard
                let rows = Int(rows),
                let columns = Int(columns),
                let squareSize = Int(squareSize)
            else {
                throw NSError(domain: "Invalid input", code: 0, userInfo: nil)
            }

            let calibrationDetails = CheckerboardDetails(
                rows: rows,
                columns: columns,
                squareSize: squareSize,
                placement: placement
            )

            try await modelHealth.calibrateCamera(
                session,
                checkerboardDetails: calibrationDetails
            )
        } catch {
            print(error.localizedDescription)
        }
    }
}

#Preview {
    CameraCalibrationView(session: .forPreview)
        .environmentObject(ModelHealthService())
}
