# Model Health iOS Example

A native SwiftUI app implementing the complete SDK workflow: session management, camera calibration, subject calibration, activity recording, and analysis retrieval.

## Requirements

- iOS 18.0+
- Xcode 16.0+
- An API key

## Configuration

Two files are required but not committed to the repository — they contain your signing credentials and API key. Templates for both are provided.

**1. Signing configuration**

Copy the template and fill in your Apple Developer details:

```bash
cp LocalConfig.xcconfig.template LocalConfig.xcconfig
```

Open `LocalConfig.xcconfig` and replace the placeholder values:

```
DEVELOPMENT_TEAM = YOUR_TEAM_ID
PRODUCT_BUNDLE_IDENTIFIER = com.yourcompany.ModelHealthDemo
```

Your Team ID can be found in [Apple Developer](https://developer.apple.com/account) under **Membership details**.

**2. API key**

Copy the template and add your API key:

```bash
cp ModelHealthDemo/Source/ExampleConfig.swift.template ModelHealthDemo/Source/ExampleConfig.swift
```

Open `ExampleConfig.swift` and replace the placeholder:

```swift
enum ExampleConfig {
    static let apiKey = "your_api_key_here"
}
```

## Launch

Open the project in Xcode and run it on a connected device or simulator:

```bash
open ModelHealthDemo.xcodeproj
```

Select your target device in Xcode's toolbar and press **Run** (⌘R).

The SDK is fetched automatically via Swift Package Manager.
