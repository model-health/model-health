import SwiftUI
import ModelHealth

struct NeutralPoseCalibrationView: View {
    let subject: Subject
    let session: Session

    @State private var isCalibrating = false
    @State private var calibrationComplete = false

    @EnvironmentObject private var modelHealth: ModelHealthService

    var body: some View {
        VStack(spacing: 20) {
            Text("Please assume a neutral pose in front of the camera to begin calibration.")

            Spacer()

            ZStack {
                Image(systemName: "figure.arms.open")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 250, height: 250)
                    .foregroundColor(.accentColor)

                Image(systemName: "triangle")
                    .foregroundColor(.accentColor)
                    .font(.system(size: 300).weight(.ultraLight))
                    .offset(x: -1.5, y: -2)
            }

            if isCalibrating {
                ProgressView("Calibrating...")
            }

            Spacer()

            Button(action: {
                Task {
                    await performCalibration()
                }
            }) {
                Text("Start Calibration")
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(isCalibrating)
        }
        .padding()
        .navigationTitle("Neutral Pose Calibration")
        .navigationDestination(isPresented: $calibrationComplete) {
            RecordTrialView(subject: subject, session: session)
        }
    }

    private func performCalibration() async {
        isCalibrating = true
        calibrationComplete = false

        do {
            try await modelHealth.calibrateNeutralPose(
                for: subject,
                in: session
            ) { status in
                print("Calibration status: \(status)")
            }
            
            calibrationComplete = true
        } catch {
            print("Calibration failed: \(error.localizedDescription)")
        }

        isCalibrating = false
    }
}

#if DEBUG
#Preview {
    NavigationStack {
        NeutralPoseCalibrationView(subject: .forPreview(), session: .forPreview())
            .environmentObject(ModelHealthService(serviceProvider: MockModelHealthProvider()))
    }
}
#endif
