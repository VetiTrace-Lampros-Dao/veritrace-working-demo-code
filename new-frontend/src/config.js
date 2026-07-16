/**
 * ============================================================================
 * config.js — Central configuration for VeriTrace Frontend
 * ============================================================================
 * 
 * All API endpoints, contract addresses, ABI definitions, and supported
 * file types are defined here. Change these values when switching between
 * local development and production deployments.
 */

// ─────────────────────────────────────────────────────────────
// API Endpoints (deployed backends)
// ─────────────────────────────────────────────────────────────

/** 
 * Hash Engine API — Handles file upload, SHA-256 computation, and 
 * perceptual hashing. Built in Go with BoltDB local storage.
 * Endpoints: POST /api/v1/register, POST /api/v1/verify
 */
export const HASH_ENGINE_API = 'https://api.hash.veritrace.dpkvtrading.online';

/**
 * Core Backend API — Orchestration layer connecting on-chain registry,
 * PostgreSQL metadata, Redis cache, and Qdrant vector search.
 * Endpoints: GET /api/v1/verify/exact?hash=, GET /api/v1/verify/fuzzy?phash=
 */
export const CORE_BACKEND_API = 'https://api.veritrace.dpkvtrading.online';

// ─────────────────────────────────────────────────────────────
// Smart Contract (Arbitrum Sepolia)
// ─────────────────────────────────────────────────────────────

/**
 * Deployed VeritraceRegistry Stylus contract address.
 * Written in Rust, compiled to WASM, deployed on Arbitrum Sepolia.
 * Explorer: https://sepolia.arbiscan.io/address/0x468edc5b2fe9d1c919f2377cbe0ccb16f32ead29
 */
export const CONTRACT_ADDRESS = '0x468edc5b2fe9d1c919f2377cbe0ccb16f32ead29';

/**
 * ABI for the VeritraceRegistry contract.
 * Extracted from the Rust Stylus source (lib.rs).
 * 
 * Functions:
 *   - registerContent(bytes32, uint64, string, string) — anchors content on-chain
 *   - verifyContent(bytes32) → (address, uint64, uint64, string, string) — reads record
 * 
 * Events:
 *   - ContentRegistered — emitted on successful registration
 */
export const CONTRACT_ABI = [
  // ── Write function: Register new content ──
  'function registerContent(bytes32 sha256hash, uint64 phash, string ipfs_cid, string ai_tool)',

  // ── Read function: Verify content by hash ──
  'function verifyContent(bytes32 sha256hash) view returns (address creator, uint64 timestamp, uint64 phash, string ipfs_cid, string ai_tool)',

  // ── Event: Emitted when content is registered ──
  'event ContentRegistered(bytes32 indexed sha256hash, address indexed creator, uint64 phash, uint64 timestamp, string ipfsCid, string aitool)',

  // ── Error types ──
  'error ContentAlreadyRegistered(bytes32 sha256hash)',
  'error ContentNotFound(bytes32 sha256hash)',
];

/**
 * Arbitrum Sepolia network configuration for ethers.js.
 * Chain ID 421614, public RPC endpoint.
 */
export const ARBITRUM_SEPOLIA = {
  chainId: 421614,
  chainIdHex: '0x66eee',
  name: 'Arbitrum Sepolia',
  rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
  explorer: 'https://sepolia.arbiscan.io',
  currency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
};

// ─────────────────────────────────────────────────────────────
// Supported File Types
// ─────────────────────────────────────────────────────────────

/**
 * Allowed media types for upload, matching the hash engine's 
 * detectMediaType() function in service.go.
 */
export const SUPPORTED_FILES = {
  image: {
    extensions: ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    accept: 'image/png,image/jpeg,image/gif,image/webp',
    label: 'Images',
    icon: '🖼️',
  },
  video: {
    extensions: ['.mp4', '.mov', '.webm', '.mkv'],
    accept: 'video/mp4,video/quicktime,video/webm,video/x-matroska',
    label: 'Videos',
    icon: '🎬',
  },
  document: {
    extensions: ['.pdf', '.doc', '.docx', '.txt'],
    accept: '.pdf,.doc,.docx,.txt,application/pdf,text/plain',
    label: 'Documents',
    icon: '📄',
  },
};

/** Combined accept string for the file input element */
export const ALL_ACCEPTED = Object.values(SUPPORTED_FILES)
  .map(f => f.accept)
  .join(',');

/** Max file sizes in bytes by category */
export const MAX_FILE_SIZES = {
  image: 50 * 1024 * 1024,      // 50 MB
  document: 50 * 1024 * 1024,   // 50 MB
  video: 500 * 1024 * 1024,     // 500 MB
  default: 50 * 1024 * 1024,    // 50 MB fallback
};

