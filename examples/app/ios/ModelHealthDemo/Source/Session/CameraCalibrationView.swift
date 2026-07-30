import SwiftUI
import ModelHealth

struct CameraCalibrationView: View {
    let session: Session

    @State private var rows: String = "4"
    @State private var columns: String = "5"
    @State private var squareSize: String = "35"
    @State private var placement: CheckerboardPlacement = .perpendicular
    @State private var isCalibrating = false
    @State private var calibrationComplete = false

    @EnvironmentObject private var modelHealth: ModelHealthService

    var body: some View {
        VStack(spacing: 20) {
            HStack {
                Text("Rows")
                    .frame(width: 100, alignment: .leading)
                TextField("4", text: $rows)
                    .multilineTextAlignment(.trailing)
                    .keyboardType(.numberPad)
            }

            HStack {
                Text("Columns")
                    .frame(width: 100, alignment: .leading)
                TextField("5", text: $columns)
                    .multilineTextAlignment(.trailing)
                    .keyboardType(.numberPad)
            }

            HStack {
                Text("Square Size")
                    .frame(width: 100, alignment: .leading)
                TextField("35", text: $squareSize)
                    .multilineTextAlignment(.trailing)
                    .keyboardType(.numberPad)
                Text("mm")
                    .foregroundColor(.secondary)
            }

            HStack {
                Text("Placement on Floor")

                Spacer()

                Picker("Placement on Floor", selection: $placement) {
                    ForEach(CheckerboardPlacement.allCases) { option in
                        Text(option.rawValue).tag(option)
                    }
                }
            }

            Spacer()

            LoadingButton(
                title: "Calibrate",
                isLoading: isCalibrating,
                isDisabled: isCalibrating
            ) {
                Task {
                    await performCalibration()
                }
            }
            .padding(.bottom, 12)
        }
        .navigationTitle("Checkerboard Details")
        .navigationDestination(isPresented: $calibrationComplete) {
            SubjectSelectionView(session: session)
        }
        .padding()
    }

    private func performCalibration() async {
        isCalibrating = true

        defer {
            isCalibrating = false
        }

        do {
            guard
                let rows = Int(rows),
                let columns = Int(columns),
                let squareSize = Int(squareSize)
            else {
                fatalError(
                    (#file as NSString).lastPathComponent + ":" + #function + ": Invalid input"
                )
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
            ) { status in
                switch status {
                case .recording:
                    print("• Recording...")

                case .uploading(uploaded: let uploaded, total: let total):
                    print("• Uploading... \(uploaded)/\(total)")

                case .processing(percent: let percent):
                    if let percent {
                        print("• Processing... \(percent)%")
                    } else {
                        print("• Processing....")
                    }

                case .done:
                    print("• Calibration complete!")
                }
            }

            calibrationComplete = true
        } catch let error as ModelHealthError {
            print(error.message)
        } catch {
            print(error.localizedDescription)
        }
    }
}

#if DEBUG
#Preview {
    NavigationStack {
        CameraCalibrationView(session: .forPreview())
            .environmentObject(ModelHealthService(serviceProvider: MockModelHealthProvider()))
    }
}
#endif
