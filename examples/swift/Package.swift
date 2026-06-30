// swift-tools-version: 5.9
import PackageDescription

let modelHealth: Target.Dependency = .product(name: "ModelHealth", package: "model-health-swift")
let shared: Target.Dependency = .target(name: "Shared")
let linkerSettings: [LinkerSetting] = [
    .linkedFramework("SystemConfiguration", .when(platforms: [.macOS])),
    .linkedFramework("Security", .when(platforms: [.macOS])),
]

func script(_ name: String) -> Target {
    .executableTarget(
        name: name,
        dependencies: [modelHealth, shared],
        linkerSettings: linkerSettings
    )
}

let package = Package(
    name: "ModelHealthExamples",
    platforms: [.macOS(.v14)],
    dependencies: [
        .package(url: "https://github.com/model-health/model-health-swift", from: "0.5.0"),
    ],
    targets: [
        .target(
            name: "Shared",
            dependencies: [modelHealth],
            linkerSettings: linkerSettings
        ),
        script("AddExternalData"),
        script("SessionData"),
        script("ActivityRecording"),
        script("ActivityAnalysis"),
        script("UpdateActivity"),
        script("ArchiveSession"),
        script("OpenCapImport"),
        script("PlotKinematics"),
    ]
)
