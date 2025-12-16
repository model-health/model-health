import Foundation

// MARK: - Opaque Types

/// Opaque pointer to Rust provider
typealias ModelHealthProviderHandle = OpaquePointer

// MARK: - Result Types

struct FFIResult {
    let success: Bool
    let errorMessage: UnsafeMutablePointer<CChar>?
}

// MARK: - C Function Declarations

@_silgen_name("model_health_provider_new")
func model_health_provider_new() -> ModelHealthProviderHandle?

@_silgen_name("model_health_provider_new_with_url")
func model_health_provider_new_with_url(_ baseUrl: UnsafePointer<CChar>)
-> ModelHealthProviderHandle?

@_silgen_name("model_health_provider_free")
func model_health_provider_free(_ handle: ModelHealthProviderHandle)

@_silgen_name("model_health_free_error")
func model_health_free_error(_ message: UnsafeMutablePointer<CChar>)

@_silgen_name("model_health_free_string")
func model_health_free_string(_ string: UnsafeMutablePointer<CChar>)

// MARK: - Authentication

@_silgen_name("model_health_register")
func model_health_register(
    _ handle: ModelHealthProviderHandle,
    _ username: UnsafePointer<CChar>,
    _ email: UnsafePointer<CChar>,
    _ password: UnsafePointer<CChar>,
    _ firstName: UnsafePointer<CChar>,
    _ lastName: UnsafePointer<CChar>,
    _ newsletter: Bool
) -> FFIResult

@_silgen_name("model_health_login")
func model_health_login(
    _ handle: ModelHealthProviderHandle,
    _ username: UnsafePointer<CChar>,
    _ password: UnsafePointer<CChar>,
    _ result: UnsafeMutablePointer<Int32>
) -> FFIResult

@_silgen_name("model_health_verify")
func model_health_verify(
    _ handle: ModelHealthProviderHandle,
    _ code: UnsafePointer<CChar>,
    _ rememberDevice: Bool
) -> FFIResult

@_silgen_name("model_health_logout")
func model_health_logout(_ handle: ModelHealthProviderHandle) -> FFIResult

@_silgen_name("model_health_is_authenticated")
func model_health_is_authenticated(
    _ handle: ModelHealthProviderHandle,
    _ result: UnsafeMutablePointer<Bool>
) -> FFIResult

@_silgen_name("model_health_get_token")
func model_health_get_token(_ handle: ModelHealthProviderHandle) -> UnsafeMutablePointer<CChar>?

@_silgen_name("model_health_set_token")
func model_health_set_token(_ handle: ModelHealthProviderHandle, _ token: UnsafePointer<CChar>) -> FFIResult

// MARK: - C Data Types

struct CSession {
    let id: UnsafeMutablePointer<CChar>?
    let name: UnsafeMutablePointer<CChar>?
    let sessionName: UnsafeMutablePointer<CChar>?
    let user: Int32
    let isPublic: Bool
    let qrcode: UnsafeMutablePointer<CChar>?
    let subject: Int32  // -1 for None
    let trialsCount: Int32
}

struct CSessionArray {
    let sessions: UnsafeMutablePointer<CSession>?
    let count: Int
}

struct CSubject {
    let id: Int32
    let name: UnsafeMutablePointer<CChar>?
    let weight: Double  // 0.0 for None
    let height: Double  // 0.0 for None
    let age: Int32  // -1 for None
    let birthYear: Int32  // 0 for None
    let gender: Int32  // 0=Man, 1=Woman, 2=Transgender, 3=NonBinary, 4=NoResponse
    let sexAtBirth: Int32  // 0=Man, 1=Woman, 2=Intersex, 3=NotListed, 4=NoResponse
    let characteristics: UnsafeMutablePointer<CChar>?
    let subjectTagsJson: UnsafeMutablePointer<CChar>?
}

struct CSubjectArray {
    let subjects: UnsafeMutablePointer<CSubject>?
    let count: Int
}

struct CTrial {
    let id: UnsafeMutablePointer<CChar>?
    let session: UnsafeMutablePointer<CChar>?
    let name: UnsafeMutablePointer<CChar>?
    let status: UnsafeMutablePointer<CChar>?
    let videos: CVideoArray
    let results: CTrialResultArray
}

struct CTrialArray {
    let trials: UnsafeMutablePointer<CTrial>?
    let count: Int
}

struct CAnalysisTask {
    let taskId: UnsafeMutablePointer<CChar>?
}

struct CVideo {
    let id: UnsafeMutablePointer<CChar>?
    let trial: UnsafeMutablePointer<CChar>?
    let video: UnsafeMutablePointer<CChar>?
    let videoThumb: UnsafeMutablePointer<CChar>?
}

struct CVideoArray {
    let videos: UnsafeMutablePointer<CVideo>?
    let count: Int
}

struct CTrialResult {
    let id: Int32
    let trial: UnsafeMutablePointer<CChar>?
    let tag: UnsafeMutablePointer<CChar>?
    let media: UnsafeMutablePointer<CChar>?
}

struct CTrialResultArray {
    let results: UnsafeMutablePointer<CTrialResult>?
    let count: Int
}

struct CData {
    let data: UnsafeMutablePointer<UInt8>?
    let length: Int
}

struct CDataArray {
    let items: UnsafeMutablePointer<CData>?
    let count: Int
}

struct CResultData {
    let fileType: Int32  // 0=Json, 1=Csv
    let data: UnsafeMutablePointer<UInt8>?
    let length: Int
}

struct CResultDataArray {
    let items: UnsafeMutablePointer<CResultData>?
    let count: Int
}

// MARK: - Free Functions

@_silgen_name("model_health_free_session_array")
func model_health_free_session_array(_ array: CSessionArray)

@_silgen_name("model_health_free_subject_array")
func model_health_free_subject_array(_ array: CSubjectArray)

@_silgen_name("model_health_free_trial_array")
func model_health_free_trial_array(_ array: CTrialArray)

@_silgen_name("model_health_free_analysis_task")
func model_health_free_analysis_task(_ task: CAnalysisTask)

@_silgen_name("model_health_free_video_array")
func model_health_free_video_array(_ array: CVideoArray)

@_silgen_name("model_health_free_trial_result_array")
func model_health_free_trial_result_array(_ array: CTrialResultArray)

@_silgen_name("model_health_free_data_array")
func model_health_free_data_array(_ array: CDataArray)

@_silgen_name("model_health_free_result_data_array")
func model_health_free_result_data_array(_ array: CResultDataArray)

// MARK: - List Operations

@_silgen_name("model_health_session_list")
func model_health_session_list(
    _ handle: ModelHealthProviderHandle,
    _ result: UnsafeMutablePointer<CSessionArray>
) -> FFIResult

@_silgen_name("model_health_get_session")
func model_health_get_session(
    _ handle: ModelHealthProviderHandle,
    _ sessionId: UnsafePointer<CChar>,
    _ result: UnsafeMutablePointer<CSession>
) -> FFIResult

@_silgen_name("model_health_subject_list")
func model_health_subject_list(
    _ handle: ModelHealthProviderHandle,
    _ result: UnsafeMutablePointer<CSubjectArray>
) -> FFIResult

@_silgen_name("model_health_trial_list_for_session")
func model_health_trial_list_for_session(
    _ handle: ModelHealthProviderHandle,
    _ sessionId: UnsafePointer<CChar>,
    _ result: UnsafeMutablePointer<CTrialArray>
) -> FFIResult

@_silgen_name("model_health_download_videos")
func model_health_download_videos(
    _ handle: ModelHealthProviderHandle,
    _ urls: UnsafePointer<UnsafePointer<CChar>?>,
    _ urlCount: Int,
    _ result: UnsafeMutablePointer<CDataArray>
) -> FFIResult

// MARK: - Create Operations

@_silgen_name("model_health_create_session")
func model_health_create_session(
    _ handle: ModelHealthProviderHandle,
    _ result: UnsafeMutablePointer<CSession>
) -> FFIResult

@_silgen_name("model_health_create_subject")
func model_health_create_subject(
    _ handle: ModelHealthProviderHandle,
    _ name: UnsafePointer<CChar>,
    _ weight: Double,
    _ height: Double,
    _ birthYear: Int32,
    _ sexAtBirth: Int32,
    _ gender: Int32,
    _ terms: Bool,
    _ result: UnsafeMutablePointer<CSubject>
) -> FFIResult

// MARK: - Recording Operations

@_silgen_name("model_health_record")
func model_health_record(
    _ handle: ModelHealthProviderHandle,
    _ trialName: UnsafePointer<CChar>,
    _ sessionId: UnsafePointer<CChar>,
    _ result: UnsafeMutablePointer<CTrial>
) -> FFIResult

@_silgen_name("model_health_stop_recording")
func model_health_stop_recording(
    _ handle: ModelHealthProviderHandle,
    _ sessionId: UnsafePointer<CChar>
) -> FFIResult

// MARK: - Calibration Operations

typealias CalibrationStatusCallback = @convention(c) (
    UnsafeMutableRawPointer?, UnsafePointer<CChar>?
) -> Void

@_silgen_name("model_health_calibrate_camera")
func model_health_calibrate_camera(
    _ handle: ModelHealthProviderHandle,
    _ sessionId: UnsafePointer<CChar>,
    _ rows: Int32,
    _ columns: Int32,
    _ squareSize: Int32,
    _ placement: Int32,
    _ callback: CalibrationStatusCallback,
    _ userData: UnsafeMutableRawPointer?
) -> FFIResult

@_silgen_name("model_health_calibrate_neutral_pose")
func model_health_calibrate_neutral_pose(
    _ handle: ModelHealthProviderHandle,
    _ sessionId: UnsafePointer<CChar>,
    _ subjectId: Int32,
    _ callback: CalibrationStatusCallback,
    _ userData: UnsafeMutableRawPointer?
) -> FFIResult

// MARK: - Analysis Operations

@_silgen_name("model_health_start_analysis")
func model_health_start_analysis(
    _ handle: ModelHealthProviderHandle,
    _ analysisType: Int32,
    _ trialId: UnsafePointer<CChar>,
    _ sessionId: UnsafePointer<CChar>,
    _ result: UnsafeMutablePointer<CAnalysisTask>
) -> FFIResult

@_silgen_name("model_health_get_analysis_status")
func model_health_get_analysis_status(
    _ handle: ModelHealthProviderHandle,
    _ taskId: UnsafePointer<CChar>,
    _ status: UnsafeMutablePointer<Int32>,
    _ resultTagsJson: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>
) -> FFIResult

@_silgen_name("model_health_download_analysis_result")
func model_health_download_analysis_result(
    _ handle: ModelHealthProviderHandle,
    _ trialId: UnsafePointer<CChar>,
    _ resultTag: UnsafePointer<CChar>,
    _ resultJson: UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>
) -> FFIResult

@_silgen_name("model_health_get_trial_status")
func model_health_get_trial_status(
    _ handle: ModelHealthProviderHandle,
    _ trialId: UnsafePointer<CChar>,
    _ sessionId: UnsafePointer<CChar>,
    _ status: UnsafeMutablePointer<Int32>,
    _ uploaded: UnsafeMutablePointer<Int32>,
    _ total: UnsafeMutablePointer<Int32>
) -> FFIResult

@_silgen_name("model_health_download_trial_videos")
func model_health_download_trial_videos(
    _ handle: ModelHealthProviderHandle,
    _ trialId: UnsafePointer<CChar>,
    _ sessionId: UnsafePointer<CChar>,
    _ version: Int32,  // 0=Raw, 1=Synced
    _ result: UnsafeMutablePointer<CDataArray>
) -> FFIResult

@_silgen_name("model_health_download_trial_result_data")
func model_health_download_trial_result_data(
    _ handle: ModelHealthProviderHandle,
    _ trialId: UnsafePointer<CChar>,
    _ sessionId: UnsafePointer<CChar>,
    _ dataTypes: UnsafePointer<Int32>,
    _ dataTypeCount: Int,
    _ result: UnsafeMutablePointer<CResultDataArray>
) -> FFIResult
