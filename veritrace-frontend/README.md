# VeriTrace Content Provenance Sandbox UI

This is the interactive frontend sandbox built in **React + Vite** for testing **VeriTrace** content registration and verification. It integrates directly with:
- **Hashing Microservice** (`localhost:8081`): Extracts file hashes and temporal keyframes.
- **Arbitrum Sepolia Smart Contract** (`0x468edc5...`): Registers original media fingerprints directly using MetaMask.
- **Core backend engine** (`localhost:8080`): Performs exact-match and fuzzy KNN searches to verify media origins.

---

## Features
1. **Wallet Connection**: Real-time MetaMask connectivity, balance indicators, and contract initialization.
2. **Registration Sandbox**: Drag and drop visual media, calculate signatures via the hashing service, package metadata, sign, and broadcast transactions directly to the block explorer.
3. **Verification Sandbox**: Extract signatures from target files, query exact database cache matches, and fall back to fuzzy pHash similarity searches in Qdrant. Displays result outcomes (Original, Derivative, or Unregistered).

---

## Local Development Setup

### 1. Install Dependencies
Run from the `veritrace-frontend` directory:
```bash
npm install
```

### 2. Start Hashing and Core Services
Ensure both the core backend engine (`localhost:8080`) and the hashing microservice (`localhost:8081`) are running:
```bash
# In veritrace-core-backend
docker compose up -d

# In veritrace-hashing-service
docker compose up -d
```

### 3. Run React Development Server
Start the Vite development server:
```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Interactive Walkthrough Steps

### Phase A: Wallet Connection
1. Open the UI dashboard and click **Connect MetaMask**.
2. Select your testnet account (ensure your wallet is connected to the **Arbitrum Sepolia Testnet**).

---

### Phase B: Register Content
1. Select the **Register Original Content** tab.
2. Drag and drop an image or video file.
3. The dashboard will automatically query the hashing microservice to extract SHA-256 and perceptual pHash sequences.
4. Click **Commit Fingerprint to Arbitrum Sepolia**.
5. Confirm the transaction in MetaMask.
6. Once signed, a clickable link to Arbiscan will appear, and the core backend's background event listener will automatically catch the event and index the data into Postgres, Redis, and Qdrant!

---

### Phase C: Verify Content
1. Select the **Verify Media Origin** tab.
2. Drag and drop either the original file or a slightly edited copy (e.g. cropped/edited image or a video clip).
3. Click **Perform Verification Query**.
4. The frontend will search:
   - `/api/v1/verify/exact`: To identify identical file registrations.
   - `/api/v1/verify/fuzzy`: To search Qdrant for visually matching frames.
5. Review the outcome cards and matching metadata scores.
