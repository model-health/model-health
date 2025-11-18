import SwiftUI
import ModelHealth

struct VerificationView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject private var modelHealth: ModelHealthService
    @Binding var isVerified: Bool
    
    @State private var verificationCode = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 20) {
            Spacer()

            TextField("Verification Code", text: $verificationCode)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.numberPad)

            HStack {
                Text("Please enter the verification code")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Spacer()
            }
            
            if let errorMessage = errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundColor(.red)
            }

            Spacer()

            LoadingButton(
                title: "Verify",
                isLoading: isLoading,
                isDisabled: verificationCode.count != 6,
                action: verifyCode
            )
            .padding(.bottom, 12)
        }
        .padding(.horizontal)
        .navigationBarTitle("Verification Required")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Cancel") {
                    dismiss()
                }
            }
        }
    }
    
    private func verifyCode() {
        errorMessage = nil
        isLoading = true
        
        Task {
            do {
                try await modelHealth.verify(code: verificationCode)
                
                await MainActor.run {
                    isLoading = false
                    isVerified = true
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = "Verification failed: \(error.localizedDescription)"
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        VerificationView(isVerified: .constant(false))
            .environmentObject(ModelHealthService())
    }
}
