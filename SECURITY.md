# Security Architecture: Zero-Knowledge Vault

This document provides a technical breakdown of how the **Fuck-I.C.E.-Vault** secures footage using Zero-Knowledge principles.

## 1. Core Principles
- **Zero-Knowledge**: Our servers never see your raw video, your encryption keys, or your passphrase.
- **Client-Side Cryptography**: All encryption and decryption happen locally in your browser/device.
- **Recovery Resiliency**: Designed specifically for high-risk situations where a physical device might be seized or destroyed.

---

## 2. Key Hierarchy

The vault uses a multi-layered key system to balance security with recoverability.

### A. Data Encryption Key (DEK)
- **What it is**: A random 256-bit AES key generated uniquely for every video file.
- **Function**: This key is used to encrypt the actual video data.
- **Storage**: It is stored in the database in a **wrapped (encrypted)** state.

### B. Key Encryption Key (KEK)
- **What it is**: A transient key derived from your **Personal Passphrase**.
- **Function**: It acts as a "wrapper" to encrypt the DEK.
- **Storage**: Never stored. It is recalculated in memory during deposit or retrieval.

### C. Personal Vault Passphrase
- **What it is**: The words/password you choose during the deposit.
- **Function**: The source entropy for the KEK.
- **Privacy**: Never leaves your device.

### D. Emergency Backup Key
- **What it is**: The raw DEK represented as a hex string (e.g., `ICE-A1B2...`).
- **Function**: An absolute last resort to decrypt the file if the passphrase is forgotten.

---

## 3. Cryptographic Implementation

We utilize the **Web Crypto API**, a native browser standard for secure operations.

### Key Derivation (Passphrase to KEK)
We use **PBKDF2** (Password-Based Key Derivation Function 2) with the following parameters:
- **Algorithm**: HMAC-SHA256
- **Iterations**: 100,000 (Protected against GPU/ASIC brute-force)
- **Salt**: 128-bit unique random salt generated per upload (Prevents rainbow table attacks).

### File Encryption (DEK to Video)
We use **AES-256-GCM** (Galois/Counter Mode):
- **Authenticated Encryption**: GCM ensures that if the encrypted file is tampered with by a third party, decryption will fail immediately (integrity check).
- **IV (Initialization Vector)**: A unique 96-bit IV is generated for every chunk of data.

---

## 4. Workflows

### The Deposit Flow (Locking)
1. **Key Generation**: Browser generates a random DEK.
2. **File Encryption**: The video is encrypted with the DEK locally.
3. **Key Wrapping**:
   - User enters Passphrase.
   - Browser derives KEK from Passphrase + random Salt.
   - Browser encrypts the DEK using the KEK (Resulting in a "Wrapped Key").
4. **Transmission**: The encrypted video and the **Wrapped Key** (with its salt) are sent to storage/database. The raw keys are discarded from memory.

### The Retrieval Flow (Unlocking)
1. **Fetch**: The browser downloads the encrypted video and the Wrapped Key.
2. **Key Unwrapping**:
   - User enters Passphrase.
   - Browser derives KEK from Passphrase + the stored Salt.
   - KEK is used to decrypt the Wrapped Key, revealing the original DEK.
3. **Decryption**: The DEK is used to decrypt the video file locally for viewing or download.

---

## 5. Threat Model

| Threat | Security Outcome |
| :--- | :--- |
| **Device Seizure** | Even if the phone is seized, the footage stays safe in the vault. The user can recover it from any other device using their Passphrase. |
| **Server Breach** | If an attacker gains full access to our database and S3 buckets, they only see randomized garbage. They cannot derive the keys without the user's Passphrase. |
| **Brute Force** | 100,000 PBKDF2 iterations make it computationally expensive for attackers to "guess" common passwords against a stolen database. |
| **Key Theft** | A single leaked hex key (DEK) only unlocks *one* specific video, not the entire user vault. |

---

## 6. Verification
You can verify these operations by inspecting the `storageService.ts` file. Notice that no functions send the `passphrase` or the `secretKey` raw to any API endpoint. Every `supabase.insert` or `fetch` operation only touches the encrypted results.
