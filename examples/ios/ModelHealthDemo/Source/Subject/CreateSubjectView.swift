import SwiftUI
import ModelHealth

struct CreateSubjectView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var modelHealth: ModelHealthService

    @State private var name = ""
    @State private var weight = ""
    @State private var height = ""
    @State private var birthYear = ""
    @State private var subjectTags: [String] = []
    @State private var newTag = ""
    @State private var selectedGender: Subject.Gender? = .woman
    @State private var selectedSex: Subject.Sex? = .woman
    @State private var characteristics = ""
    @State private var agreedToTerms = true

    @State private var isCreating = false
    @State private var errorMessage: String?

    var onSubjectCreated: (Subject) -> Void

    var body: some View {
        NavigationStack {
            Form {
                basicInformationSection
                measurementsSection
                tagsSection
                optionalSection
                consentSection

                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.callout)
                    }
                }
            }
            .navigationTitle("Create Subject")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .disabled(isCreating)
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        Task {
                            await createSubject()
                        }
                    }
                    .disabled(!isFormValid || isCreating)
                }
            }
            .disabled(isCreating)
            .overlay {
                if isCreating {
                    ZStack {
                        Color.black.opacity(0.3)
                            .ignoresSafeArea()

                        ProgressView("Creating subject...")
                            .padding()
                            .background(.regularMaterial)
                            .cornerRadius(12)
                    }
                }
            }
        }
    }

    private var basicInformationSection: some View {
        Section("Basic Information") {
            TextField("Name", text: $name)
                .autocorrectionDisabled()

            TextField("Birth Year", text: $birthYear)
                .keyboardType(.numberPad)
                .onChange(of: birthYear) { _, newValue in
                    if newValue.count > 4 {
                        birthYear = String(newValue.prefix(4))
                    }
                }
        }
    }

    private var measurementsSection: some View {
        Section {
            TextField("Weight (kg)", text: $weight)
                .keyboardType(.decimalPad)

            TextField("Height (cm)", text: $height)
                .keyboardType(.decimalPad)
        } header: {
            Text("Measurements")
        } footer: {
            Text("Weight in kilograms, height in centimeters")
                .font(.caption)
        }
    }

    private var tagsSection: some View {
        Section {
            HStack {
                TextField("Add tag", text: $newTag)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .onSubmit {
                        addTag()
                    }

                Button(action: addTag) {
                    Image(systemName: "plus.circle.fill")
                        .foregroundColor(.accentColor)
                }
                .disabled(newTag.trimmingCharacters(in: .whitespaces).isEmpty)
            }

            if subjectTags.isEmpty {
                Text("No tags added")
                    .foregroundColor(.secondary)
                    .font(.callout)
            } else {
                FlowLayout(spacing: 8) {
                    ForEach(subjectTags, id: \.self) { tag in
                        TagChip(tag: tag) {
                            removeTag(tag)
                        }
                    }
                }
                .padding(.vertical, 4)
            }
        } header: {
            Text("Subject Tags")
        } footer: {
            Text("Add tags to categorize the subject. Press return or tap + to add.")
                .font(.caption)
        }
    }

    private var optionalSection: some View {
        Section("Optional Information") {
            Picker("Gender", selection: $selectedGender) {
                Text("Not specified").tag(nil as Subject.Gender?)
                ForEach(Subject.Gender.allCases, id: \.self) { gender in
                    Text(formatGenderLabel(gender)).tag(gender as Subject.Gender?)
                }
            }

            Picker("Sex at Birth", selection: $selectedSex) {
                Text("Not specified").tag(nil as Subject.Sex?)
                ForEach(Subject.Sex.allCases, id: \.self) { sex in
                    Text(formatSexLabel(sex)).tag(sex as Subject.Sex?)
                }
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("Characteristics")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                TextEditor(text: $characteristics)
                    .frame(height: 100)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
                    )
            }
            .padding(.vertical, 4)
        }
    }

    private var consentSection: some View {
        Section {
            Toggle(isOn: $agreedToTerms) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Informed Consent")
                        .font(.subheadline)
                    Text("I confirm that informed consent has been obtained from the research participant")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
    }

    private var isFormValid: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty &&
        !weight.isEmpty &&
        Double(weight) != nil &&
        !height.isEmpty &&
        Double(height) != nil &&
        !birthYear.isEmpty &&
        isValidBirthYear &&
        agreedToTerms
    }

    private var isValidBirthYear: Bool {
        guard let year = Int(birthYear) else {
            return false
        }
        
        let currentYear = Calendar.current.component(.year, from: Date())
        return year >= 1900 && year <= currentYear
    }

    private func addTag() {
        let trimmed = newTag.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty, !subjectTags.contains(trimmed) else {
            newTag = ""
            return
        }
        subjectTags.append(trimmed)
        newTag = ""
    }

    private func removeTag(_ tag: String) {
        subjectTags.removeAll { $0 == tag }
    }

    private func formatGenderLabel(_ gender: Subject.Gender) -> String {
        switch gender {
        case .woman:
         return "Woman"
        
        case .man:
         return "Man"
        
        case .transgender:
         return "Transgender"
        
        case .nonBinary:
         return "Non-binary"
        
        case .noResponse:
         return "Prefer not to respond"
        }
    }

    private func formatSexLabel(_ sex: Subject.Sex) -> String {
        switch sex {
        case .woman:
         return "Woman"
        
        case .man:
         return "Man"
        
        case .intersex:
         return "Intersex"
        
        case .notListed:
         return "Not listed"
        
        case .noResponse:
         return "Prefer not to respond"
        }
    }

    private func createSubject() async {
        guard let weightValue = Double(weight),
              let heightValue = Double(height),
              let birthYearValue = Int(birthYear) else {
            errorMessage = "Please enter valid numbers for weight, height, and birth year"
            return
        }

        guard isValidBirthYear else {
            errorMessage = "Birth year must be between 1900 and the current year"
            return
        }

        isCreating = true
        errorMessage = nil

        do {
            let params = SubjectParameters(
                name: name.trimmingCharacters(in: .whitespaces),
                weight: weightValue,
                height: heightValue,
                birthYear: birthYearValue,
                sexAtBirth: selectedSex,
                gender: selectedGender,
                characteristics: characteristics.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "" : characteristics.trimmingCharacters(in: .whitespacesAndNewlines)
            )

            let subject = try await modelHealth.createSubject(parameters: params)

            onSubjectCreated(subject)
            dismiss()
        } catch let error as ModelHealthError {
            isCreating = false
            errorMessage = error.message
        } catch {
            isCreating = false
            errorMessage = "Failed to create subject: \(error.localizedDescription)"
        }
    }
}

struct TagChip: View {
    let tag: String
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 4) {
            Text(tag)
                .font(.subheadline)

            Button(action: onRemove) {
                Image(systemName: "xmark.circle.fill")
                    .font(.caption)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color.accentColor.opacity(0.15))
        .foregroundColor(.accentColor)
        .cornerRadius(16)
    }
}

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(
            in: proposal.replacingUnspecifiedDimensions().width,
            subviews: subviews,
            spacing: spacing
        )
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(
            in: bounds.width,
            subviews: subviews,
            spacing: spacing
        )
        for (index, subview) in subviews.enumerated() {
            subview.place(at: result.positions[index], proposal: .unspecified)
        }
    }

    struct FlowResult {
        var size: CGSize
        var positions: [CGPoint]

        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var positions: [CGPoint] = []
            var size: CGSize = .zero
            var currentX: CGFloat = 0
            var currentY: CGFloat = 0
            var lineHeight: CGFloat = 0

            for subview in subviews {
                let subviewSize = subview.sizeThatFits(.unspecified)

                if currentX + subviewSize.width > maxWidth && currentX > 0 {
                    currentX = 0
                    currentY += lineHeight + spacing
                    lineHeight = 0
                }

                positions.append(CGPoint(x: currentX, y: currentY))
                currentX += subviewSize.width + spacing
                lineHeight = max(lineHeight, subviewSize.height)
                size.width = max(size.width, currentX - spacing)
                size.height = currentY + lineHeight
            }

            self.size = size
            self.positions = positions
        }
    }
}

#if DEBUG
#Preview {
    CreateSubjectView { subject in
        print("Created subject: \(subject.name)")
    }
    .environmentObject(ModelHealthService(serviceProvider: MockModelHealthProvider()))
}
#endif
