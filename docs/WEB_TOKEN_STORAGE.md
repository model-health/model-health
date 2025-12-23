# Web Token Storage Strategies

This document outlines secure approaches for storing authentication tokens in web browsers.

## Security Requirements

Authentication tokens must be:
1. **Confidential** - Not accessible to unauthorized parties
2. **Tamper-proof** - Cannot be modified by attackers
3. **Fresh** - Expire after reasonable time periods
4. **Revocable** - Can be invalidated server-side

## Storage Options

### 1. HTTP-Only Cookies (Recommended for Production)

**Best for:** Traditional web applications with same-origin API calls

**Security:**
- ✅ Not accessible via JavaScript (immune to XSS)
- ✅ Automatic inclusion in requests
- ✅ SameSite protection against CSRF
- ✅ Secure flag for HTTPS-only transmission

**Implementation:**

```typescript
// Server-side (Node.js/Express example)
res.cookie('auth_token', token, {
  httpOnly: true,      // Not accessible via JavaScript
  secure: true,        // HTTPS only
  sameSite: 'strict',  // CSRF protection
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
});

// Client-side - no explicit storage needed
// Browser automatically sends cookie with requests
```

**Pros:**
- Best XSS protection
- Browser handles security
- Works across tabs

**Cons:**
- Requires same-origin API or CORS with credentials
- More complex for mobile apps
- Requires CSRF tokens for state-changing operations

---

### 2. Encrypted IndexedDB (Recommended for SPAs)

**Best for:** Single-page applications, Progressive Web Apps

**Security:**
- ✅ Encrypted with Web Crypto API
- ✅ Larger storage capacity than localStorage
- ✅ Asynchronous API
- ⚠️ Vulnerable to XSS (but encrypted at rest)

**Implementation:**

```typescript
import { TokenStorage } from '@modelhealth/sdk';

class EncryptedIndexedDBStorage implements TokenStorage {
  private dbName = 'modelhealth';
  private storeName = 'tokens';
  private encryptionKey: CryptoKey | null = null;

  async init() {
    // Derive encryption key from user credentials or device ID
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('your-secret-material'),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    this.encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('modelhealth-salt'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async getToken(): Promise<string | null> {
    const db = await this.openDB();
    const tx = db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    const encrypted = await store.get('auth_token');

    if (!encrypted || !this.encryptionKey) return null;

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: encrypted.iv },
      this.encryptionKey,
      encrypted.data
    );

    return new TextDecoder().decode(decrypted);
  }

  async setToken(token: string): Promise<void> {
    if (!this.encryptionKey) await this.init();

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey!,
      new TextEncoder().encode(token)
    );

    const db = await this.openDB();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    await store.put({ data: encrypted, iv }, 'auth_token');
  }

  async removeToken(): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    await store.delete('auth_token');
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }
}

// Usage
const storage = new EncryptedIndexedDBStorage();
await storage.init();

const client = new ModelHealthService({ storage });
```

**Pros:**
- Good balance of security and usability
- Works for SPAs and PWAs
- Encrypted at rest
- Large storage capacity

**Cons:**
- Still vulnerable to XSS (if attacker can execute code)
- More complex implementation
- Requires Web Crypto API support

---

### 3. LocalStorage with Short Expiry (Development Only)

**Best for:** Development, prototyping, demos

**Security:**
- ⚠️ Vulnerable to XSS
- ⚠️ No encryption
- ⚠️ Accessible to all scripts on the domain

**Implementation:**

```typescript
import { LocalStorageTokenStorage } from '@modelhealth/sdk';

const client = new ModelHealthService({
  storage: new LocalStorageTokenStorage(),
});
```

**Pros:**
- Simple to implement
- Synchronous API
- Works across tabs

**Cons:**
- NOT suitable for production
- No XSS protection
- No encryption
- Small storage limit (5-10MB)

---

### 4. Memory Storage (Testing Only)

**Best for:** Unit tests, temporary sessions

**Security:**
- ✅ Cleared on page refresh
- ⚠️ Lost when user navigates away

**Implementation:**

```typescript
import { MemoryTokenStorage } from '@modelhealth/sdk';

const client = new ModelHealthService({
  storage: new MemoryTokenStorage(),
});
```

**Pros:**
- Simplest implementation
- No persistence risk
- Fast

**Cons:**
- Token lost on refresh
- NOT suitable for production
- Doesn't work across tabs

---

## Hybrid Approach (Best Practice)

For maximum security, use a combination:

```typescript
class HybridTokenStorage implements TokenStorage {
  private shortTermMemory = new MemoryTokenStorage();
  private longTermStorage: EncryptedIndexedDBStorage;
  private refreshToken: string | null = null;

  async getToken(): Promise<string | null> {
    // First check memory (fast)
    let token = await this.shortTermMemory.getToken();
    
    if (token) {
      // Verify token hasn't expired
      if (this.isTokenValid(token)) {
        return token;
      }
    }

    // Try to refresh using refresh token
    if (this.refreshToken) {
      token = await this.refreshAccessToken(this.refreshToken);
      if (token) {
        await this.shortTermMemory.setToken(token);
        return token;
      }
    }

    return null;
  }

  async setToken(token: string): Promise<void> {
    // Store access token in memory
    await this.shortTermMemory.setToken(token);
    
    // Store refresh token encrypted
    if (this.refreshToken) {
      await this.longTermStorage.setToken(this.refreshToken);
    }
  }

  private isTokenValid(token: string): boolean {
    // Decode JWT and check expiration
    // Implementation depends on your token format
    return true;
  }

  private async refreshAccessToken(refreshToken: string): Promise<string | null> {
    // Call your API to get new access token
    return null;
  }
}
```

---

## Security Best Practices

### 1. Token Rotation
```typescript
// Rotate tokens regularly
setInterval(async () => {
  const newToken = await api.refreshToken();
  await storage.setToken(newToken);
}, 15 * 60 * 1000); // Every 15 minutes
```

### 2. Secure Transmission
```typescript
// Always use HTTPS
const client = new ModelHealthService({
  // API calls automatically use HTTPS in production
});
```

### 3. Content Security Policy
```html
<!-- Add CSP headers to prevent XSS -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src https://api.modelhealth.io">
```

### 4. Token Expiration
```typescript
// Set reasonable token lifetimes
{
  accessToken: '15 minutes',
  refreshToken: '7 days',
  rememberMe: '30 days'
}
```

### 5. Logout Everywhere
```typescript
// Server-side token revocation
await client.logout(); // Invalidates all tokens server-side
```

---

## Platform-Specific Recommendations

### React / Vue / Svelte
- **Development:** `LocalStorageTokenStorage`
- **Production:** `EncryptedIndexedDBStorage` or HTTP-only cookies

### React Native
```typescript
import * as SecureStore from 'expo-secure-store';

class SecureStoreTokenStorage implements TokenStorage {
  async getToken() {
    return await SecureStore.getItemAsync('auth_token');
  }

  async setToken(token: string) {
    await SecureStore.setItemAsync('auth_token', token);
  }

  async removeToken() {
    await SecureStore.deleteItemAsync('auth_token');
  }
}
```

### Electron
```typescript
import Store from 'electron-store';

const store = new Store({
  encryptionKey: 'your-secret-key',
});

class ElectronTokenStorage implements TokenStorage {
  async getToken() {
    return store.get('auth_token') ?? null;
  }

  async setToken(token: string) {
    store.set('auth_token', token);
  }

  async removeToken() {
    store.delete('auth_token');
  }
}
```

---

## Never Do This

❌ Store tokens in URL parameters
❌ Log tokens to console in production
❌ Store tokens in plain localStorage without encryption in production
❌ Share tokens between different domains
❌ Store sensitive data with tokens
❌ Use tokens without expiration

---

## Summary

| Storage Method | Security | Ease | Production | XSS Protection |
|----------------|----------|------|------------|----------------|
| HTTP-Only Cookies | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ✅ | ✅ |
| Encrypted IndexedDB | ⭐⭐⭐⭐ | ⭐⭐ | ✅ | ⚠️ |
| LocalStorage | ⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ | ❌ |
| Memory | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ | ❌ |

Choose the approach that best fits your application's security requirements and deployment environment.
