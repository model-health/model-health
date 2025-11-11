import SwiftUI
import ModelHealth

struct RecordTrialView: View {
    let subject: Subject
    let session: Session

    @State private var activityName: String = ""
    @State private var isRecording = false
    @State private var currentTrial: Trial?
    @State private var errorMessage: String?

    @EnvironmentObject private var modelHealth: ModelHealthService

    var body: some View {
        VStack(spacing: 24) {
            // Activity Name Input
            VStack(alignment: .leading, spacing: 8) {
                Text("Activity Name")
                    .font(.headline)

                TextField("e.g., Walking, Squatting, Jump", text: $activityName)
                    .textFieldStyle(.roundedBorder)
                    .disabled(isRecording)
                    .autocorrectionDisabled()
            }

            if isRecording {
                VStack(spacing: 8) {
                    Image(systemName: "record.circle.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(.red)
                        .symbolEffect(.pulse)

                    Text("Recording in progress")
                        .font(.headline)

                    Text("Have the subject perform the activity")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color.red.opacity(0.1))
                .cornerRadius(12)
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.subheadline)
                    .foregroundStyle(.red)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(8)
            }

            Spacer()

            LoadingButton(
                title: isRecording ? "Stop Recording" : "Start Recording",
                isLoading: false,
                isDisabled: activityName.trimmingCharacters(in: .whitespaces).isEmpty,
            ) {
                Task {
                    await isRecording ? stopRecordingTrial() : startRecordingTrial()
                }
            }
        }
        .padding()
        .navigationTitle("Record Trial")
    }

    // MARK: - Actions

    private func startRecordingTrial() async {
        errorMessage = nil
        isRecording = true

        do {
            let trial = try await modelHealth.recordTrial(
                for: subject,
                in: session,
                named: activityName
            )
            currentTrial = trial
        } catch {
            errorMessage = "Failed to start recording: \(error.localizedDescription)"
            isRecording = false
        }
    }

    private func stopRecordingTrial() async {
        guard let trialId = currentTrial?.id else {
            return
        }

        do {
            try await modelHealth.stopRecording(trialId: trialId)

            activityName = ""
            currentTrial = nil
            isRecording = false
        } catch {
            errorMessage = "Failed to stop recording: \(error.localizedDescription)"
            isRecording = false
        }
    }
}

#Preview {
    NavigationStack {
        RecordTrialView(subject:.forPreview, session: .forPreview)
            .environmentObject(ModelHealthService())
    }
}
