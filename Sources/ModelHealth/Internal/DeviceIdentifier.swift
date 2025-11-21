import Foundation
import Security

final class DeviceIdentifier {
    private static let service = "io.modelhealth.device-identifier"
    private static let account = "deviceIdentifier"

    static func getDeviceIdentifier() throws -> String {
        if let existing = loadFromKeychain() {
            return existing
        }

        let newIdentifier = UUID().uuidString
        if saveToKeychain(newIdentifier) {
            return newIdentifier
        }

        throw ModelHealthError.internalError("Failed to generate device identifier")
    }
}

extension DeviceIdentifier {
    private static func loadFromKeychain() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard
            status == errSecSuccess,
            let data = result as? Data,
            let identifier = String(data: data, encoding: .utf8)
        else {
            return nil
        }

        return identifier
    }

    private static func saveToKeychain(_ identifier: String) -> Bool {
        guard let data = identifier.data(using: .utf8) else {
            return false
        }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data
        ]

        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)

        return true
    }
}
