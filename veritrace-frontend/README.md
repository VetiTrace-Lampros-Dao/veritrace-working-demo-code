# VeriTrace Frontend

VeriTrace is a decentralized content authenticity registry and similarity search engine. The frontend application allows creators to fingerprint digital media, anchor ownership records immutably on the Arbitrum Sepolia blockchain, and verify file provenance.

## 🚀 Key Features

* **On-Chain Registry Integration**: Directly calls the compiled Rust Stylus contract (`VeritraceRegistry`) on the Arbitrum Sepolia network via MetaMask and `ethers.js` (v6).
* **Decentralized Asset Explorer**: Automatically queries historical event logs (`ContentRegistered` events) from block `0` to build an instant, real-time library of all registered assets without relying on database states.
* **Hybrid Verification Engine**:
  * **On-Chain Check**: Checks for exact cryptographic matches by fetching provenance data directly from the contract.
  * **Fuzzy Database Check**: Integrates with the VeriTrace Hash Engine to fetch visual lookalikes using perceptual visual signatures (pHash) and vector index similarity scores.
* **Client-Side SHA-256 Hashing**: Instant, secure checksum generation using the browser's native Web Crypto API.
* **AI Generator Attribution**: Built-in dropdown list of popular models (alphabetic order) or custom inputs to declare creator tools during registration.
* **Persistent Upload Pipeline**: Utilizes a custom global state provider to ensure large file uploads and pending Web3 signatures are not interrupted or lost during page transitions.

---

## 🛠️ Tech Stack

* **Core**: React 19, Vite, Javascript
* **Web3 Integration**: Ethers.js v6, MetaMask (window.ethereum)
* **Styling**: Custom Vanilla CSS (fluid grids, HSL palette tokens, smooth micro-animations, glassmorphism)
* **Routing**: React Router DOM v6

---

## ⚙️ Project Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* [MetaMask Wallet Extension](https://metamask.io/) configured for the **Arbitrum Sepolia Testnet**

### Installation

1. Install package dependencies:
   ```bash
   npm install
   ```

2. Start the local development server:
   ```bash
   npm run dev
   ```
   The application will be served at `http://localhost:5173/`.

3. Build production-optimized bundles:
   ```bash
   npm run build
   ```

---

## 🔧 Configuration Details

All configurations (contract addresses, ABIs, endpoints, and file size limits) are managed in:
👉 [`src/config.js`](file:///c:/Users/daksh/.gemini/antigravity/scratch/VeriTrace/veritrace-frontend/src/config.js)

### Connected Resources:
* **Contract Address**: `0xd5a4e9185cbcea881f2c76b07732335250537820` (Arbitrum Sepolia)
* **Hash Engine API**: `https://api.hash.veritrace.dpkvtrading.online`
* **Core Backend API**: `https://api.veritrace.dpkvtrading.online`


---

## 📁 Directory Structure

```text
veritrace-frontend/
├── src/
│   ├── components/
│   │   ├── FileUpload.jsx      # Drag-and-drop file uploader (supports dynamic limits)
│   │   ├── HashDisplay.jsx     # Visual cryptographic & perceptual hex/decimal display
│   │   ├── SearchResults.jsx   # List of visually similar derivative files
│   │   ├── Navbar.jsx          # Sticky header navigation + MetaMask controls
│   │   └── Topbar.jsx          # Network indicator + Sepolia faucet marquee
│   ├── context/
│   │   └── UploadContext.jsx   # Global provider for persistent uploads & state
│   ├── pages/
│   │   ├── HomePage.jsx        # Landing hero, statistics, and registry guide
│   │   ├── RegisterPage.jsx    # 4-stage registration flow (XHR upload progress + Web3 transaction)
│   │   ├── VerifyPage.jsx      # Proof-of-authenticity lookup (direct contract + database queries)
│   │   └── LibraryPage.jsx     # Event-sourced log explorer for registered assets
│   ├── config.js               # ABI, network options, extension limits, and API URLs
│   ├── index.css               # Global theme tokens, typography, layouts, and loaders
│   └── main.jsx                # App wrapper with router and state context
```
