import SwiftUI

struct SplashView: View {
    var body: some View {
        ZStack {
            Color(.systemBackground)
                .ignoresSafeArea()

            Image("model-health")
                .resizable()
                .scaledToFit()
                .frame(width: 120, height: 120)
        }
    }
}

#Preview {
    SplashView()
}
