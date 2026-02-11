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
            url: "https://github.com/model-health/model-health/releases/download/v0.1.16/ModelHealthFFI.xcframework.zip",
            checksum: "2ac2444db3454697fae3ecc68bb7f0a8075c2f0355d9069e9849c7993aa8c70d"
        ),
        .target(
            name: "ModelHealth",
            dependencies: ["ModelHealthFFI"],
            path: "Sources/ModelHealth"
        ),
    ]
)
