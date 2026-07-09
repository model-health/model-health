import SwiftUI

struct LoadingButton: View {
    let title: LocalizedStringKey
    let isLoading: Bool
    let isDisabled: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .fontWeight(.semibold)
                .frame(maxWidth: .infinity)
                .opacity(isLoading ? 0 : 1)
                .overlay {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(
                                CircularProgressViewStyle(
                                    tint: .primary
                                )
                            )
                            .scaleEffect(0.8)
                    }
                }
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
        .disabled(isDisabled || isLoading)
    }
}

#Preview {
    LoadingButton(
        title: "Submit",
        isLoading: false,
        isDisabled: false,
        action: {}
    )
    .padding()

    LoadingButton(
        title: "Submit",
        isLoading: false,
        isDisabled: true,
        action: {}
    )
    .padding()

    LoadingButton(
        title: "Submit",
        isLoading: true,
        isDisabled: false,
        action: {}
    )
    .padding()
}
