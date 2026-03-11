/**
 * @inception/blockchain — Public Barrel
 * IECR Blockchain Layer: C2PA Provenance, ERC-2981 Royalties, IPFS Storage
 */

export * from "./provenance.js";
export * from "./royalty-engine.js";
export * from "./ipfs-storage.js";

export const BLOCKCHAIN_VERSION = "1.0.0-p1";
export const BLOCKCHAIN_NOTE = "Phase 1: local provenance + royalty math. Phase 2: on-chain anchoring.";
