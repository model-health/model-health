// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ModelHealth",
    platforms: [
        .iOS(.v15),
        .macOS(.v12)
    ],
    products: [
        .library(
            name: "ModelHealth",
            targets: ["ModelHealth"]
        ),
    ],
    targets: [
        .target(
            name: "ModelHealth",
            path: "Sources/ModelHealth",
            linkerSettings: [
                .unsafeFlags([
                    "-L", "../model-health-ffi/target/release",
                    "-lmodel_health_ffi"
                ])
            ]
        ),
        .testTarget(
            name: "ModelHealthTests",
            dependencies: ["ModelHealth"]
        ),
    ]
)
