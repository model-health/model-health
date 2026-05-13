// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ModelHealthExamples",
    platforms: [.macOS(.v14)],
    dependencies: [
        .package(url: "https://github.com/model-health/model-health-swift", from: "0.5.0"),
    ],
    targets: [
        .executableTarget(
            name: "AddExternalData",
            dependencies: [
                .product(name: "ModelHealth", package: "model-health-swift"),
            ],
            linkerSettings: [
                .linkedFramework("SystemConfiguration", .when(platforms: [.macOS])),
                .linkedFramework("Security", .when(platforms: [.macOS])),
            ]
        ),
    ]
)
