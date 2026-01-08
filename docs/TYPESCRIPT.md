# Swift vs TypeScript API Comparison

## Protocol / Interface

### Swift
```swift
protocol BackendService {
    func login(username: String, password: String) async throws -> LoginResult
    func verify(code: String, rememberDevice: Bool) async throws
    func subjectList() async throws -> [Subject]
    func trialList() async throws -> [Trial]
    func videoList() async throws -> [Video]
    func createSession() async throws -> Session
    func calibrateCamera(_ session: Session, checkerboardDetails: CheckerboardDetails) async throws
    func calibrateNeutralPose() async throws
    func recordTrial(named name: String) async throws
    func stopRecording(trialId: String) async throws
    func fetchAnalysis(trialId: String) async throws -> Data
}
```

### TypeScript
```typescript
export interface BackendService {
  login(username: string, password: string): Promise<LoginResult>;
  verify(code: string, rememberDevice: boolean): Promise<void>;
  subjectList(): Promise<Subject[]>;
  trialList(): Promise<Trial[]>;
  videoList(): Promise<Video[]>;
  createSession(): Promise<Session>;
  calibrateCamera(session: Session, checkerboardDetails: CheckerboardDetails): Promise<void>;
  calibrateNeutralPose(): Promise<void>;
  recordTrial(named: string): Promise<void>;
  stopRecording(trialId: string): Promise<void>;
  fetchAnalysis(trialId: string): Promise<Uint8Array>;
}
```

---

## Session

### Swift
```swift
public struct Session: Decodable, Identifiable, Sendable {
    public let id: String
    public let user: Int
    public let `public`: Bool
    public let name: String
    public let sessionName: String
    public let qrcode: String?
    public let trials: [String]
    public let server: String?
    public let subject: Int?
    public let trialsCount: Int
}
```

### TypeScript
```typescript
export interface Session {
  id: string;
  user: number;
  public: boolean;
  name: string;
  sessionName: string;
  qrcode?: string;
  trials: string[];
  server?: string;
  subject?: number;
  trialsCount: number;
}
```

---

## Subject

### Swift
```swift
public struct Subject: Decodable, Identifiable, Sendable {
    public enum Gender: String, Decodable, Sendable {
        case woman = "woman"
        case man = "man"
        case transgender = "transgender"
        case nonBinary = "non-binary"
        case noResponse = "prefer-not-respond"
    }

    public enum Sex: String, Decodable, Sendable {
        case woman = "woman"
        case man = "man"
        case intersect = "intersect"
        case notListed = "not-listed"
        case noResponse = "prefer-not-respond"
    }

    public let id: Int
    public let name: String
    public let weight: Double?
    public let height: Double?
    public let age: Int?
    public let birthYear: Int?
    public let gender: Gender
    public let genderDisplay: String
    public let sexAtBirth: Sex?
    public let sexDisplay: String
    public let characteristics: String
    public let subjectTags: [String]
}
```

### TypeScript
```typescript
export type Gender = "woman" | "man" | "transgender" | "non-binary" | "prefer-not-respond";

export type Sex = "woman" | "man" | "intersect" | "not-listed" | "prefer-not-respond";

export interface Subject {
  id: number;
  name: string;
  weight?: number;
  height?: number;
  age?: number;
  birthYear?: number;
  gender: Gender;
  genderDisplay: string;
  sexAtBirth?: Sex;
  sexDisplay: string;
  characteristics: string;
  subjectTags: string[];
}
```

---

## Video

### Swift
```swift
public struct Video: Decodable, Sendable {
    public let id: String
    public let trial: String
    public let deviceId: String
    public let video: String?
    public let videoUrl: String?
    public let videoThumb: String?
    public let createdAt: Date
    public let updatedAt: Date
}
```

### TypeScript
```typescript
export interface Video {
  id: string;
  trial: string;
  deviceId: string;
  video?: string;
  videoUrl?: string;
  videoThumb?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Result

### Swift
```swift
public struct Result: Decodable, Sendable {
    public let id: String
    public let trial: String
    public let tag: String?
    public let media: String?
    public let mediaUrl: String?
    public let deviceId: String?
    public let createdAt: Date
    public let updatedAt: Date
}
```

### TypeScript
```typescript
export interface Result {
  id: string;
  trial: string;
  tag?: string;
  media?: string;
  mediaUrl?: string;
  deviceId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Trial

### Swift
```swift
public struct Trial: Decodable, Sendable {
    public let id: String
    public let session: String
    public let name: String?
    public let status: String
    public let videos: [Video]
    public let results: [Result]
    public let createdAt: Date
    public let updatedAt: Date
    public let server: String?
    public let isDocker: Bool?
    public let hostname: String?
    public let processedDuration: String?
    public let processedCount: Int?
    public let gitCommit: String?
    public let trashed: Bool
    public let trashedAt: Date?
}
```

### TypeScript
```typescript
export interface Trial {
  id: string;
  session: string;
  name?: string;
  status: string;
  videos: Video[];
  results: Result[];
  createdAt: Date;
  updatedAt: Date;
  server?: string;
  isDocker?: boolean;
  hostname?: string;
  processedDuration?: string;
  processedCount?: number;
  gitCommit?: string;
  trashed: boolean;
  trashedAt?: Date;
}
```

---

## SessionStatus

### Swift
```swift
public struct SessionStatus: Decodable, Sendable {
    public let status: String
    public let trial: String
    public let frameRate: Int
    public let nCamerasConnected: Int
    public let nVideosUploaded: Int
}
```

### TypeScript
```typescript
export interface SessionStatus {
  status: string;
  trial: string;
  frameRate: number;
  nCamerasConnected: number;
  nVideosUploaded: number;
}
```

---

## CheckerboardPlacement

### Swift
```swift
public enum CheckerboardPlacement: String, CaseIterable, Identifiable, Sendable {
    case perpendicular
    case parallel

    public var id: String {
        self.rawValue
    }
}
```

### TypeScript
```typescript
export type CheckerboardPlacement = "perpendicular" | "parallel";
```

---

## CheckerboardDetails

### Swift
```swift
public struct CheckerboardDetails: Sendable {
    public let rows: Int
    public let columns: Int
    public let squareSize: Int
    public let placement: CheckerboardPlacement

    public init(rows: Int, columns: Int, squareSize: Int, placement: CheckerboardPlacement) {
        self.rows = rows
        self.columns = columns
        self.squareSize = squareSize
        self.placement = placement
    }
}
```

### TypeScript
```typescript
export interface CheckerboardDetails {
  rows: number;
  columns: number;
  squareSize: number;
  placement: CheckerboardPlacement;
}
```

---

## LoginResult

### Swift
```swift
public enum LoginResult: Sendable {
    case ok
    case verification_required
}
```

### TypeScript
```typescript
export type LoginResult = "ok" | "verification_required";
```
