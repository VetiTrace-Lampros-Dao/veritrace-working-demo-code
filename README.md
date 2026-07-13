# Frontend API Integration Guide

This guide is specifically tailored for Frontend Developers. It outlines the step-by-step logic, API endpoints, request bodies, and expected responses for the two primary flows in the Veritrace application: **Content Registration** and **Content Verification**.

> **Environment Variables / Constants**
> * `HASH_API_URL`: `https://api.hash.veritrace.dpkvtrading.online`
> * `CORE_API_URL`: `https://api.veritrace.dpkvtrading.online`

---

## 1. The Pre-Requisite: Extracting File Signatures (Both Flows)

Before you can Register or Verify a file, you must extract its cryptographic and perceptual signatures. This is triggered when a user drops or selects a file.

### Step 1: Call the Hashing Service
**Endpoint:** `POST {HASH_API_URL}/api/v1/hash`
**Content-Type:** `multipart/form-data`

* **Request Body:**
  Append the actual file object to a `FormData` object under the key `'file'`.
  ```javascript
  const formData = new FormData();
  formData.append('file', selectedFile);
  ```

* **Expected Response (JSON):**
  ```json
  {
    "sha256": "0x123abc...",
    "phash": 1234567890,
    "media_type": "image", // or "video", "document"
    "keyframes": [         // Only present for videos/documents
      { "offset": 1, "phash": 567890123 }
    ]
  }
  ```
*Save this response in your state (e.g., `hashingResult`) as you will need these values for the next steps.*

---

## 2. Content Registration Flow (`executeRegistration`)

Once the file is hashed and the user fills out the metadata form (AI preferences, webhooks), you can execute the registration.

### Step 1: Pin Raw Media to IPFS / S3
**Endpoint:** `POST {CORE_API_URL}/api/v1/pin-file`
**Content-Type:** `multipart/form-data`

* **Request Body:** The raw `FormData` containing the file.
* **Expected Response:**
  ```json
  {
    "media_ipfs_url": "ipfs://Qm...",
    "media_s3_url": "https://s3.amazonaws.com/..."
  }
  ```

### Step 2: Pin Metadata to IPFS
Construct a JSON payload combining the hashing results and the user's form inputs, then pin it.

**Endpoint:** `POST {CORE_API_URL}/api/v1/pin`
**Content-Type:** `application/json`

* **Request Body:**
  ```json
  {
    "sha256": "0x123abc...",
    "representative_phash": 1234567890,
    "media_ipfs_url": "ipfs://Qm...",
    "media_s3_url": "https://s3.amazonaws.com/...",
    "allow_ai_training": true,
    "webhook_url": "https://example.com/webhook",
    "parent_sha256": "", 
    "media_type": "image",
    "keyframes": [] 
  }
  ```
* **Expected Response:**
  ```json
  {
    "ipfs_cid": "QmYourMetadataCid..."
  }
  ```

### Step 3: Blockchain Transaction (Smart Contract)
Use `ethers.js` (or `wagmi`) to prompt the user's wallet to sign the transaction.
* **Method:** `contract.registerContent(sha256, phash, ipfsCid, aiToolName, gasOverrides)`
* **Wait for Confirmation:** `await tx.wait()`
* **Success:** The backend listener will automatically pick up the blockchain event and save it to the PostgreSQL/Qdrant databases.

---

## 3. Content Verification Flow (`executeVerification`)

When a user uploads a file to verify it against the registry, follow a fallback chain: exact match first, then fuzzy/segment match.

### Step 1: Check for Exact Match
**Endpoint:** `GET {CORE_API_URL}/api/v1/verify/exact?hash={hashingResult.sha256}`

* **Expected Response:**
  ```json
  {
    "match_found": true,
    "exact_match": true,
    "similarity": 100,
    "record": { ... } // The registered metadata
  }
  ```
* **Logic:** If `match_found` is `true`, stop here and display the Exact Match result to the user. If `false`, proceed to Step 2.

### Step 2 (Branch A): Segmented Match (Videos & Documents)
If the exact match failed AND the `media_type` is `video` or `document` (meaning `hashingResult.keyframes` has data), execute a segment verification.

**Endpoint:** `POST {CORE_API_URL}/api/v1/verify/segments`
**Content-Type:** `application/json`

* **Request Body:**
  ```json
  {
    "sha256": "0x123abc...",
    "media_type": "video",
    "segments": [
      { "offset": 1, "phash": 567890123 },
      { "offset": 2, "phash": 987654321 }
    ]
  }
  ```
* **Expected Response:**
  ```json
  {
    "match_found": true,
    "exact_match": false,
    "similarity": 88.5,
    "record": { ... }
  }
  ```

### Step 2 (Branch B): Fuzzy Match (Single Images)
If the exact match failed AND the `media_type` is an `image` (no keyframes), execute a fuzzy visual search using the perceptual hash.

**Endpoint:** `GET {CORE_API_URL}/api/v1/verify/fuzzy?phash={hashingResult.phash}`

* **Expected Response:**
  ```json
  {
    "match_found": true,
    "exact_match": false,
    "similarity": 95.3,
    "record": { ... }
  }
  ```

### Step 3: Handle Final Result
* If the fallback (Branch A or B) returns `match_found: true`, display a **Derivative Match** along with the `similarity` percentage and the parent `record` data.
* If it returns `match_found: false`, display **Unregistered Asset**.

---

## 4. Helpful Utilities

### Download Certificate
If a user wants to download the verification proof JSON:
**Endpoint:** `GET {CORE_API_URL}/api/v1/verify/certificate?hash={targetHash}`
**Action:** Trigger a browser file download using `URL.createObjectURL(blob)`.

### View Asset Lineage (Derivatives)
To show a tree of copies derived from an original asset:
**Endpoint:** `GET {CORE_API_URL}/api/v1/content/{targetHash}/lineage`
**Response:** Returns a JSON tree map of derivative hashes and similarity scores.






### All Enpoints 


1. Hashing Service Endpoints (Default Port: 8081)
POST /api/v1/hash

Purpose: Extracts cryptographic and perceptual signatures from media.
Request: multipart/form-data containing the file (Image, Video, PDF, or DOCX).
Response: JSON with sha256, phash, media_type, and keyframes (for videos/documents).
2. Core Backend API Endpoints (Default Port: 8080)
POST /api/v1/pin-file

Purpose: Uploads and pins a raw media file to IPFS.
Request: multipart/form-data containing the file.
Response: JSON returning the ipfs_cid.
POST /api/v1/pin

Purpose: Uploads and pins a JSON metadata object to IPFS.
Request: JSON payload containing your metadata fields.
Response: JSON returning the ipfs_cid.
GET /api/v1/verify/exact

Purpose: Checks for an exact 1:1 match of a file based on its SHA256 hash.
Query Params: ?hash=0xYOUR_SHA256_HASH
Response: JSON with match_found (boolean) and the record metadata if found.
GET /api/v1/verify/fuzzy

Purpose: Checks for derivative/altered copies of single images using perceptual hashing (pHash) vector similarity.
Query Params: ?phash=YOUR_PHASH_UINT64
Response: JSON with match_found, similarity percentage (e.g., 95.5), and the matching parent record.
POST /api/v1/verify/segments

Purpose: Checks for derivative/altered copies of videos or multi-page documents by analyzing multiple segment keyframes.
Request: JSON containing sha256, media_type, and an array of segments (offset and phash).
Response: JSON with match_found, similarity percentage, and the matching parent record.
GET /api/v1/verify/certificate

Purpose: Exports a verifiable JSON certificate of registration for a specific asset.
Query Params: ?hash=0xYOUR_SHA256_HASH
Response: Downloadable JSON certificate payload.
GET /api/v1/content/:hash/lineage

Purpose: Retrieves the tree/lineage of all known derivative versions stemming from an original parent asset.
URL Params: :hash (the original parent SHA256)
Response: JSON tree structure of derivative hashes and similarities.
GET /health

Purpose: System monitoring to ensure the core API, database, and vector stores are reachable.