# Changelog

All notable changes to the Model Health SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html) with a `0.x` prefix while in beta — breaking changes may occur in any minor release until 1.0.

---

## [Unreleased]

---

## [0.1.27] - 2026-02-24

### Removed
- **TypeScript:** `AnalysisResult` type removed from public exports (use the result data returned directly by `downloadActivityAnalysisResultData`)

---

## [0.1.26] - 2026-02-24

### Fixed
- Docs: corrected webpack asset conflict caused by stale `static/index.html` placeholder

---

## [0.1.25] - 2026-02-17

### Fixed
- **iOS example app:** removed self-referential `PRODUCT_BUNDLE_IDENTIFIER` assignment in `project.pbxproj` that caused Xcode to report the project as damaged
- **TypeScript example app:** removed hardcoded API key — now reads from `VITE_API_KEY` environment variable via `.env.local`
- **TypeScript README:** corrected method names (`trialList` → `activityList`, `downloadTrialVideos` → `downloadActivityVideos`, `downloadTrialResultData` → `downloadActivityResultData`), updated data type identifiers, removed non-existent `motToCsv` utility, and fixed Vite configuration example

---

## [0.1.24] - 2025-12-15

### Fixed
- Release pipeline: removed redundant tag push and duplicate `npm version` call in `release.sh`

---

## [0.1.18] - 2025-11-01

### Changed
- **TypeScript:** npm package renamed from `@modelhealth/sdk` to `@modelhealth/modelhealth`
- **TypeScript:** interface properties renamed from `snake_case` to `camelCase` to follow JavaScript conventions

### Fixed
- License standardised to Apache 2.0 across all packages

---

## [0.1.17] - 2025-10-15

### Changed
- Example apps updated for the analysis results API changes introduced in 0.1.16

---

## [0.1.16] - 2025-10-10

### Added
- **Swift & TypeScript:** `downloadActivityAnalysisResultData` — download analysis results by type (`metrics`, `report`, `data`)
- **Swift:** convenience properties on analysis results (e.g. `jumpHeight`, `peakVerticalVelocity`)

### Changed
- Analysis result structure refactored — results are now accessed by type rather than as a flat object

---

## [0.1.15] - 2025-10-01

### Added
- **Swift & TypeScript:** extended activity type list (gait, squat, sprint, and more)
- **Swift & TypeScript:** `subjectList()` — retrieve existing subjects

### Removed
- Login, registration, verification, and authentication token APIs removed — the SDK now uses API key authentication only

---

## [0.1.12] - 2025-09-01

### Changed
- **Swift:** Swift Package Manager distribution restructured — `ModelHealth` library now distributed as a binary XCFramework via GitHub releases instead of Git LFS

---

## [0.1.11] - 2025-08-15

### Changed
- **Swift:** switched from Git LFS to binary release distribution for the XCFramework

---

## [0.1.0] - 2025-07-01

### Added
- Initial release of the Model Health SDK
- **Swift:** `ModelHealthService` with session management, camera calibration, subject calibration, activity recording, and biomechanical analysis
- **TypeScript/WASM:** `ModelHealthService` with equivalent API surface for web applications
- API key authentication
