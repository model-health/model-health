import SwiftUI
import ModelHealth

struct VerificationView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject private var modelHealthSDK: ModelHealthSDK
    @Binding var isVerified: Bool
    
    @State private var verificationCode = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Verification Required")
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Text("Please enter the verification code")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                TextField("Verification Code", text: $verificationCode)
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.numberPad)
                    .padding(.horizontal)
                
                if let errorMessage = errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
                }
                
                Button(action: verifyCode) {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Verify")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(verificationCode.isEmpty || isLoading)
                .padding(.horizontal)
                
                Spacer()
            }
            .padding(.top, 40)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private func verifyCode() {
        errorMessage = nil
        isLoading = true
        
        Task {
            do {
                try await modelHealthSDK.verify(code: verificationCode)
                
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
    VerificationView(isVerified: .constant(false))
        .environmentObject(ModelHealthSDK())
}
