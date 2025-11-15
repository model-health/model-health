import SwiftUI
import ModelHealth

struct SubjectSelectionView: View {
    let session: Session

    @State private var subjects: [Subject] = []
    @State private var selectedSubject: Subject?
    @State private var subjectForNavigation: Subject?
    @State private var isLoading = false
    @State private var error: Error?

    @EnvironmentObject private var modelHealth: ModelHealthService

    var body: some View {
        VStack(spacing: 0) {
            if isLoading {
                ProgressView("Loading subjects...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = error {
                errorView(error)
            } else {
                List(subjects, selection: $selectedSubject) { subject in
                    SubjectRow(
                        subject: subject,
                        isSelected: selectedSubject?.id == subject.id
                    )
                    .contentShape(Rectangle())
                    .onTapGesture {
                        selectedSubject = subject
                    }
                }
                .listStyle(.plain)

                LoadingButton(
                    title: "Next",
                    isLoading: false,
                    isDisabled: selectedSubject == nil
                ) {
                    subjectForNavigation = selectedSubject
                }
                .padding()
            }
        }
        .navigationTitle("Select Subject")
        .navigationDestination(item: $subjectForNavigation) { subject in
            NeutralPoseCalibrationView(subject: subject, session: session)
        }
        .task {
            await loadSubjects()
        }
    }

    private func errorView(_ error: Error) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.largeTitle)
                .foregroundColor(.red)

            Text("Failed to load subjects")
                .font(.headline)

            Text(error.localizedDescription)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            Button("Retry") {
                Task {
                    await loadSubjects()
                }
            }
            .buttonStyle(.bordered)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func loadSubjects() async {
        isLoading = true
        error = nil

        do {
            subjects = try await modelHealth.subjectList()
        } catch {
            self.error = error
        }

        isLoading = false
    }
}

struct SubjectRow: View {
    let subject: Subject
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(subject.name)
                    .font(.headline)

                HStack(spacing: 8) {
                    if let age = subject.age {
                        Label("\(age)", systemImage: "calendar")
                            .font(.caption)
                    }
                    Label(subject.genderDisplay, systemImage: "person")
                        .font(.caption)
                }
                .foregroundColor(.secondary)

                if !subject.characteristics.isEmpty {
                    Text(subject.characteristics)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
            }

            Spacer()

            if isSelected {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.accentColor)
                    .font(.title3)
            }
        }
        .padding(.vertical, 8)
        .contentShape(Rectangle())
    }
}

#if DEBUG
#Preview("List") {
    NavigationStack {
        SubjectSelectionView(session: .forPreview())
            .environmentObject(ModelHealthService())
    }
}

#Preview("Row") {
    SubjectRow(subject: .forPreview(), isSelected: true)
        .padding(.horizontal)

    SubjectRow(subject: .forPreview(), isSelected: false)
        .padding(.horizontal)
}
#endif
