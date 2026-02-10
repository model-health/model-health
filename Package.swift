// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ModelHealth",
    platforms: [
        .iOS(.v15),
        .macOS(.v12),
    ],
    products: [
        .library(
            name: "ModelHealth",
            targets: ["ModelHealth"]
        )
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-docc-plugin", from: "1.0.0")
    ],
    targets: [
        .binaryTarget(
            name: "ModelHealthFFI",
            url: "https://github.com/model-health/model-health/releases/download/v0.1.11/ModelHealthFFI.xcframework.zip",
            checksum: "788a3f545d9e7c44fb8eddc2f154c8c9dabf12b95e7ed5599092e8a2ce1d00ef"
        ),
        .target(
            name: "ModelHealth",
            dependencies: ["ModelHealthFFI"],
            path: "Sources/ModelHealth"
        ),
    ]
)
