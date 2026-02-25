# Model Health iOS Example

An iOS demo app built with SwiftUI, showing how to use the Model Health SDK to create sessions, record activities, and view analysis results.

**Requirements:** Xcode 16+, iOS 18+

## Setup

**1. Add your API key**

Copy the template and fill in your key:

```bash
cp ModelHealthDemo/Source/ExampleConfig.swift.template ModelHealthDemo/Source/ExampleConfig.swift
```

Edit `ExampleConfig.swift`:

```swift
enum ExampleConfig {
    static let apiKey = "your_api_key_here"
}
```

**2. Configure signing**

Copy the template and fill in your Apple Developer details:

```bash
cp LocalConfig.xcconfig.template LocalConfig.xcconfig
```

Edit `LocalConfig.xcconfig`:

```
DEVELOPMENT_TEAM = XXXXXXXXXX
PRODUCT_BUNDLE_IDENTIFIER = com.yourcompany.ModelHealthDemo
```

**3. Open and run**

Open `ModelHealthDemo.xcodeproj` in Xcode, select a simulator or connected device, and press Run.

The SDK is fetched automatically via Swift Package Manager from [model-health/model-health-swift](https://github.com/model-health/model-health-swift).
